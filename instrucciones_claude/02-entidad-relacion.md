# Diagrama de Entidad-Relación (ERD) - IMEDBA (Simplificado)

## Resumen: 18 entidades

| # | Entidad | Descripción |
|---|---------|-------------|
| 1 | `students` | Alumnos |
| 2 | `courses` | Catálogo de cursos (dinámico) |
| 3 | `enrollments` | Inscripciones (incluye plan de pago) |
| 4 | `discount_campaigns` | Campañas de descuento |
| 5 | `installments` | Cuotas individuales |
| 6 | `payments` | Pagos (incluye datos de recibo) |
| 7 | `books` | Libros (incluye especialidad y formato como campos) |
| 8 | `book_sales` | Ventas de libros |
| 9 | `authors` | Autores |
| 10 | `book_authors` | Relación libro-autor con % autoría |
| 11 | `diplomas` | Diplomaturas (incluye config de distribución) |
| 12 | `diploma_enrollments` | Inscripciones a diplomaturas |
| 13 | `diploma_settlements` | Liquidaciones mensuales (incluye detalle socias como JSONB) |
| 14 | `staff` | Docentes + Tutoras (unificados con tipo) |
| 15 | `hour_logs` | Registro de horas (incluye estado de factura) |
| 16 | `budget_entries` | Ingresos y egresos unificados |
| 17 | `contacts` | Empleados + Proveedores (unificados con tipo) |
| 18 | `notifications` | Notificaciones enviadas + alertas internas |

Adicionalmente: `branches` (sedes) como tabla auxiliar simple, y `activity_types` como tabla de lookup liviana.

---

## Qué se simplificó y por qué

| Antes (47 entidades) | Ahora | Razón |
|---|---|---|
| `modalities` (tabla) | Campo `modality VARCHAR` en `courses` | Es solo un atributo, no una entidad con lógica propia |
| `payment_methods` (tabla) | Enum `TRANSFERENCIA, EFECTIVO, TARJETA_CREDITO, TARJETA_DEBITO, MERCADO_PAGO, DEBITO_AUTOMATICO` | Catálogo fijo, no necesita ABM |
| `payment_plans` (tabla) | Campos en `enrollments` | Un enrollment ya ES un plan de pago |
| `receipts` (tabla) | Campos en `payments` | Un recibo es solo el PDF de un pago |
| `contract_templates` (tabla) | Campo `contract_template_path` en `courses` | Una plantilla por curso, no necesita tabla propia |
| `contracts` (tabla) | Campos en `enrollments` | El contrato es un atributo de la inscripción |
| `book_formats` (tabla) | Campo `format VARCHAR` en `books` | Es un atributo |
| `book_specialties` (tabla) | Campo `specialty VARCHAR` en `books` | Es un atributo |
| `book_stocks` (tabla) | Campos `stock_quantity`, `branch` en `books` | Stock simple si pocas sedes; o JSONB |
| `teacher_rates` (tabla) | Campo `rate_per_hour` en `activity_types` | El valor hora va directo en el tipo de actividad |
| `teachers` + `tutors` (2 tablas) | `staff` con `type ENUM` | Misma estructura, distinto tipo |
| `invoice_requests` (tabla) | Campos en `hour_logs` | La solicitud de factura es parte del flujo de horas |
| `diploma_distribution_configs` (tabla) | Campos en `diplomas` | Config de distribución es atributo de la diplomatura |
| `diploma_partners` + `diploma_settlement_lines` | JSONB en `diploma_settlements` | Socias y distribución como JSON |
| `budget_categories` + `subcategories` (2 tablas) | Enums + VARCHAR en `budget_entries` | No necesitan ABM propio |
| `subscriptions` + `cash_register_entries` (2 tablas) | Flags en `budget_entries` | Son solo tipos de movimientos |
| `employees` + `suppliers` (2 tablas) | `contacts` con `type` | Misma estructura |
| `notification_templates` + `alerts` | Todo en `notifications` con `type` | Simplificar a una sola tabla |
| `audit_logs`, `moodle_sync_logs`, `printing_orders`, `royalty_calculations` | Eliminadas | Se agregan después si hacen falta. Autorías se calculan on-the-fly |

---

## DDL Detallado

### 1. `students`

```sql
CREATE TABLE students (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(50),
    dni             VARCHAR(20),
    nationality     VARCHAR(100),
    university      VARCHAR(200),
    locality        VARCHAR(200),
    is_active       BOOLEAN DEFAULT true,
    moodle_user_id  INTEGER,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    created_by      UUID,
    deleted_at      TIMESTAMP
);
```

### 2. `courses`

```sql
CREATE TABLE courses (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(200) NOT NULL,
    code                    VARCHAR(50) UNIQUE,
    description             TEXT,
    business_unit           VARCHAR(50) NOT NULL,       -- RESIDENCIAS, PREMATUROS, EDITORIAL, OTROS
    modality                VARCHAR(50),                -- Tradicional, Intensivo, MIX, Super Intensivo
    enrollment_price        DECIMAL(12,2),              -- Precio matrícula
    course_price            DECIMAL(12,2),              -- Precio curso
    exam_date               DATE,
    contract_template_path  VARCHAR(500),               -- Ruta a la plantilla de contrato
    moodle_course_id        INTEGER,
    is_active               BOOLEAN DEFAULT true,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    deleted_at              TIMESTAMP
);
```

### 3. `enrollments` (absorbe payment_plan y contract)

```sql
CREATE TABLE enrollments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id              UUID NOT NULL REFERENCES students(id),
    course_id               UUID NOT NULL REFERENCES courses(id),
    discount_campaign_id    UUID REFERENCES discount_campaigns(id),
    enrolled_by             UUID,                       -- Vendedora (Keycloak user id)
    enrollment_date         TIMESTAMP DEFAULT NOW(),

    -- Precios
    list_price              DECIMAL(12,2) NOT NULL,
    discount_percentage     DECIMAL(5,2) DEFAULT 0,
    final_price             DECIMAL(12,2) NOT NULL,
    book_price              DECIMAL(12,2) DEFAULT 0,
    total_price             DECIMAL(12,2) NOT NULL,

    -- Plan de pago (antes era tabla separada)
    enrollment_fee          DECIMAL(12,2),              -- Monto matrícula
    num_installments        INTEGER NOT NULL DEFAULT 1,
    payment_method          VARCHAR(30),                -- TRANSFERENCIA, EFECTIVO, TARJETA_CREDITO, etc.

    -- Contrato (antes era tabla separada)
    contract_file_path      VARCHAR(500),
    contract_sent_at        TIMESTAMP,
    contract_signed_at      TIMESTAMP,

    -- Estado
    status                  VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, COMPLETED, CANCELLED
    moodle_status           VARCHAR(20),                  -- ACTIVE, SUSPENDED, NOT_SYNCED

    notes                   TEXT,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    deleted_at              TIMESTAMP
);
```

### 4. `discount_campaigns`

```sql
CREATE TABLE discount_campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    discount_type   VARCHAR(20) NOT NULL,       -- PERCENTAGE, FIXED_AMOUNT
    discount_value  DECIMAL(10,2) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

### 5. `installments` (cuotas)

```sql
CREATE TABLE installments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id       UUID NOT NULL REFERENCES enrollments(id),
    number              INTEGER NOT NULL,           -- 0 = matrícula, 1..N = cuotas
    amount              DECIMAL(12,2) NOT NULL,
    surcharge_amount    DECIMAL(12,2) DEFAULT 0,
    due_date            DATE NOT NULL,
    status              VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PAID, OVERDUE
    paid_at             TIMESTAMP,
    last_alert_sent_at  TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);
```

### 6. `payments` (absorbe receipts)

```sql
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_id      UUID REFERENCES installments(id),
    enrollment_id       UUID REFERENCES enrollments(id),
    amount              DECIMAL(12,2) NOT NULL,
    payment_method      VARCHAR(30),
    payment_date        TIMESTAMP NOT NULL,
    reference_number    VARCHAR(200),

    -- Recibo (antes era tabla separada)
    receipt_number      VARCHAR(50) UNIQUE,
    receipt_file_path   VARCHAR(500),
    receipt_sent_at     TIMESTAMP,

    notes               TEXT,
    registered_by       UUID,
    created_at          TIMESTAMP DEFAULT NOW()
);
```

### 7. `books` (absorbe specialty, format, stock)

```sql
CREATE TABLE books (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(200) NOT NULL,
    code                VARCHAR(20),                -- PED, CIR, GIN, MI1, MI2, MF, QX
    specialty           VARCHAR(100),               -- Pediatría, Cirugía, etc.
    format              VARCHAR(50),                -- Binder, Anillado, Tradicional
    edition             VARCHAR(50),
    pages               INTEGER,
    sale_price          DECIMAL(12,2) NOT NULL,
    student_discount_pct DECIMAL(5,2) DEFAULT 30,
    cost_per_unit       DECIMAL(12,2),
    stock_quantity      INTEGER DEFAULT 0,
    branch              VARCHAR(100),               -- Sede (simple por ahora)
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    deleted_at          TIMESTAMP
);
```

### 8. `book_sales`

```sql
CREATE TABLE book_sales (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id             UUID NOT NULL REFERENCES books(id),
    student_id          UUID REFERENCES students(id),
    enrollment_id       UUID REFERENCES enrollments(id),
    quantity            INTEGER NOT NULL DEFAULT 1,
    unit_price          DECIMAL(12,2) NOT NULL,
    is_student_sale     BOOLEAN DEFAULT false,
    total_amount        DECIMAL(12,2) NOT NULL,
    sale_date           TIMESTAMP DEFAULT NOW(),
    sold_by             UUID,
    created_at          TIMESTAMP DEFAULT NOW()
);
```

### 9. `authors`

```sql
CREATE TABLE authors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

### 10. `book_authors` (M:N necesaria por el % de autoría)

```sql
CREATE TABLE book_authors (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id             UUID NOT NULL REFERENCES books(id),
    author_id           UUID NOT NULL REFERENCES authors(id),
    royalty_percentage  DECIMAL(5,2) NOT NULL,
    UNIQUE(book_id, author_id)
);
```

### 11. `diplomas` (absorbe distribution_config)

```sql
CREATE TABLE diplomas (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(300) NOT NULL,
    university_name         VARCHAR(200),
    description             TEXT,
    enrollment_price        DECIMAL(12,2),
    course_price            DECIMAL(12,2),

    -- Config de distribución (antes era tabla separada)
    tax_commission_pct      DECIMAL(5,2),           -- % impuestos y comisiones
    secretary_salary        DECIMAL(12,2),          -- Sueldo secretaria (fijo)
    advertising_amount      DECIMAL(12,2),          -- Publicidad (fijo)
    admin_pct               DECIMAL(5,2),           -- % administración
    university_pct          DECIMAL(5,2),           -- % universidad
    imedba_pct              DECIMAL(5,2),           -- % IMEDBA

    -- Socias docentes como JSON (nombre, %, email)
    partners_config         JSONB DEFAULT '[]',     -- [{"name":"...", "pct":50, "email":"..."}]

    is_active               BOOLEAN DEFAULT true,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    deleted_at              TIMESTAMP
);
```

### 12. `diploma_enrollments`

```sql
CREATE TABLE diploma_enrollments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diploma_id          UUID NOT NULL REFERENCES diplomas(id),
    student_id          UUID NOT NULL REFERENCES students(id),
    enrollment_date     DATE NOT NULL,
    num_installments    INTEGER DEFAULT 1,
    payment_method      VARCHAR(30),
    status              VARCHAR(30) DEFAULT 'ACTIVE',
    pending_amount      DECIMAL(12,2) DEFAULT 0,
    notes               TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    deleted_at          TIMESTAMP
);
```

### 13. `diploma_settlements` (absorbe settlement_lines como JSONB)

```sql
CREATE TABLE diploma_settlements (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diploma_id              UUID NOT NULL REFERENCES diplomas(id),
    period_month            INTEGER NOT NULL,
    period_year             INTEGER NOT NULL,
    total_collected         DECIMAL(12,2) NOT NULL,
    tax_commission_amount   DECIMAL(12,2),
    secretary_amount        DECIMAL(12,2),
    advertising_amount      DECIMAL(12,2),
    admin_amount            DECIMAL(12,2),
    university_amount       DECIMAL(12,2),
    imedba_amount           DECIMAL(12,2),
    partners_total          DECIMAL(12,2),

    -- Detalle por socia (antes era tabla separada)
    partners_distribution   JSONB DEFAULT '[]',     -- [{"name":"...", "pct":50, "amount":1234.56, "paid":false}]

    status                  VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, APPROVED, PAID
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    UNIQUE(diploma_id, period_month, period_year)
);
```

### 14. `staff` (unifica docentes + tutoras)

```sql
CREATE TABLE staff (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    staff_type      VARCHAR(20) NOT NULL,           -- DOCENTE, TUTORA, PRECEPTORA
    is_active       BOOLEAN DEFAULT true,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);
```

### 15. `hour_logs` (absorbe invoice_requests)

```sql
CREATE TABLE hour_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id            UUID NOT NULL REFERENCES staff(id),
    activity_type       VARCHAR(50) NOT NULL,       -- CLASES, EVS_VIVO, EVS_GRABADO, APERTURAS, TUTORIA
    period_month        INTEGER NOT NULL,
    period_year         INTEGER NOT NULL,
    hours               DECIMAL(6,2) NOT NULL,
    rate_per_hour       DECIMAL(12,2) NOT NULL,
    total_amount        DECIMAL(12,2) NOT NULL,

    -- Flujo de factura (antes era tabla separada)
    invoice_email_sent_at   TIMESTAMP,
    invoice_received        BOOLEAN DEFAULT false,
    invoice_file_path       VARCHAR(500),
    payment_status          VARCHAR(20) DEFAULT 'PENDING', -- PENDING, INVOICE_RECEIVED, PAID
    paid_at                 TIMESTAMP,

    notes               TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);
```

### `activity_types` (tabla lookup liviana, no una entidad completa)

```sql
CREATE TABLE activity_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,   -- CLASES, EVS_VIVO, EVS_GRABADO, etc.
    rate_per_hour   DECIMAL(12,2) NOT NULL,         -- Valor hora actual
    applies_to      VARCHAR(20) DEFAULT 'ALL',      -- DOCENTE, TUTORA, ALL
    is_active       BOOLEAN DEFAULT true
);
```

### 16. `budget_entries` (unifica ingresos, egresos, caja, abonos)

```sql
CREATE TABLE budget_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_type          VARCHAR(10) NOT NULL,           -- INCOME, EXPENSE
    category            VARCHAR(30) NOT NULL,           -- FIXED, VARIABLE, MAINTENANCE
    subcategory         VARCHAR(100),                   -- Personal, Alquiler, Viáticos, Impresión, Servicios, etc.
    business_unit       VARCHAR(50),                    -- RESIDENCIAS, EDITORIAL, FORMACION_SUPERIOR, GENERAL
    concept             VARCHAR(300) NOT NULL,
    amount              DECIMAL(12,2) NOT NULL,
    entry_date          DATE NOT NULL,
    period_month        INTEGER NOT NULL,
    period_year         INTEGER NOT NULL,
    payment_method      VARCHAR(30),
    is_recurring        BOOLEAN DEFAULT false,          -- Para abonos/servicios fijos
    is_cash             BOOLEAN DEFAULT false,          -- Para movimientos de caja efectivo
    is_projected        BOOLEAN DEFAULT false,          -- Proyectado vs Real
    reference_number    VARCHAR(200),
    receipt_file_path   VARCHAR(500),
    contact_id          UUID REFERENCES contacts(id),   -- Empleado o proveedor asociado
    enrollment_id       UUID REFERENCES enrollments(id),-- Si linkea a una inscripción
    notes               TEXT,
    registered_by       UUID,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);
```

### 17. `contacts` (unifica empleados + proveedores)

```sql
CREATE TABLE contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_type    VARCHAR(20) NOT NULL,           -- EMPLEADO, PROVEEDOR
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    company_name    VARCHAR(200),                   -- Para proveedores
    email           VARCHAR(255),
    phone           VARCHAR(50),
    role_description VARCHAR(200),                  -- "Vendedora", "Imprenta", etc.
    keycloak_user_id UUID,                          -- Si tiene acceso al sistema
    is_active       BOOLEAN DEFAULT true,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);
```

### 18. `notifications` (unifica notificaciones + alertas)

```sql
CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type   VARCHAR(30) NOT NULL,       -- EMAIL, WHATSAPP_LINK, INTERNAL_ALERT
    category            VARCHAR(30),                -- PAYMENT_DUE, SURCHARGE, SUSPENSION, INVOICE_REQUEST, WELCOME, REMINDER, ROYALTY, CUSTOM
    recipient_email     VARCHAR(255),
    recipient_phone     VARCHAR(50),
    subject             VARCHAR(300),
    body                TEXT,
    status              VARCHAR(20) DEFAULT 'SENT', -- SENT, FAILED, PENDING, DISMISSED
    related_entity      VARCHAR(50),                -- enrollment, installment, hour_log, etc.
    related_id          UUID,

    -- Para alertas internas
    alert_date          DATE,                       -- Cuándo mostrar
    recurrence          VARCHAR(20),                -- ONCE, MONTHLY, YEARLY
    target_role         VARCHAR(50),                -- Rol que debe verla

    sent_at             TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW()
);
```

### `branches` (tabla auxiliar simple)

```sql
CREATE TABLE branches (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    address     VARCHAR(300),
    city        VARCHAR(100),
    province    VARCHAR(100),
    is_active   BOOLEAN DEFAULT true
);
```

---

## Mapa de Relaciones

```
students ──1:N──► enrollments ──1:N──► installments ──1:N──► payments
                      │
                      └──N:1──► courses
                      └──N:1──► discount_campaigns

students ──1:N──► diploma_enrollments ──N:1──► diplomas ──1:N──► diploma_settlements

books ──N:N──► authors (via book_authors, con royalty %)
books ──1:N──► book_sales

staff ──1:N──► hour_logs

budget_entries ──N:1──► contacts (opcional)
budget_entries ──N:1──► enrollments (opcional)
```

Simple. 18 entidades, relaciones claras, sin sobreingeniería.
