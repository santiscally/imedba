# ROADMAP Frontend — IMEDBA

> **Para la próxima sesión de Claude de Fran.** Leer este archivo después de `CLAUDE.md`, `instrucciones_claude/DIARIO.md` (últimas 10 entradas) y `instrucciones_claude/ESTADO.md`. Este doc dice **qué módulo sigue y cómo construirlo** — el patrón UX ya está fijado; sólo hay que clonar.

---

## Estado actual (referencia rápida)

- **Hecho:** Alumnos (CRUD + modal detail + modal form), Cursos (listado + filtro BU + sort, sin CRUD todavía).
- **Mocks:** `src/api/mock/handlers.ts` replica `PageResponse<T>` y sort/paginación. Switch con `VITE_USE_MOCK=true` en `frontend/.env`.
- **Backend real:** Fases 1–8 cerradas. Swagger en `http://localhost:8080/swagger-ui.html`. Contrato es la fuente de verdad — si agrego un módulo y no matchea Swagger, hay que re-sincronizar types.
- **Tipos espejados 1:1** (sin codegen) en `src/types/`.

---

## Patrón UX (no se discute, se clona)

Referencia canónica: [`src/pages/Alumnos.tsx`](src/pages/Alumnos.tsx) + [`src/components/StudentForm.tsx`](src/components/StudentForm.tsx) + [`src/components/StudentDetail.tsx`](src/components/StudentDetail.tsx).

1. **Header.** Título con icono lucide (22px) + subtítulo con conteo dinámico (`${total} X registrados`) + botón `btn-primary` con `Plus` a la derecha (salvo módulos read-only).
2. **Toolbar.** Input con `Search` de lucide + `debounce 300ms` que resetea `page=0`. Filtros adicionales (chips) a la derecha si aplica (ej. `businessUnit` en Cursos).
3. **Tabla.** `<SortableTh>` en columnas ordenables — **3 estados: `asc → desc → null`** (ver `toggleSort`). Ícono `ArrowUp/ArrowDown/ArrowUpDown`.
4. **Orden alfabético por defecto** en el primer campo natural (lastName, name, etc.), `sort = { field, dir: 'asc' }`. `PAGE_SIZE = 10`.
5. **Paginación.** `buildPageNumbers(current, total)` con elipsis cuando `total > 7`. Botones Prev/Next con `ChevronLeft/Right`.
6. **Panel state machine.** `type PanelState = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; entity } | { kind: 'detail'; entity }`. Un solo state, un solo setter.
7. **Modal form.** Validación client-side en `validate()` (required, email regex, `@Size` del backend como max). No usar react-hook-form mientras sean ≤15 campos.
8. **Modal detail.** Read-only, secciones semánticas (Contacto / Datos / Sistema / Observaciones). Botón "Editar" que abre el form con `initial`.
9. **Soft delete.** El backend no hace DELETE físico — toggle `active` via PUT. En UI: botón "Desactivar" en el form (no "Eliminar").
10. **Empty state.** `<EmptyState icon message hint />` para no-resultados y errores. Ícono = icono del módulo.
11. **Formatters.** Dinero con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })`. Fechas `LocalDate` (YYYY-MM-DD) parseadas a mano con `split('-')` — **nunca** `new Date(iso)` (corre TZ).
12. **SCSS duplicado por página** (Alumnos.scss, Cursos.scss). Si aparece un 3er listado con estilos idénticos, extraer a `styles/_table.scss` — hasta entonces, no prematurizar.

---

## Navegación (ya actualizada en `Sidebar.tsx`)

- **Académico:** Alumnos, Cursos, Inscripciones
- **Finanzas:** Cuotas y Pagos, Descuentos, **Diplomaturas**, **Liquidaciones**, Presupuesto
- **Editorial:** Libros, Ventas, Autores
- **Administración:** Personal, Horas, Contactos, Notificaciones

> **Cambio reciente:** la sección "Diplomas" ya no existe. `Diplomaturas` (ex `Diplomas`) + `Liquidaciones` viven dentro de **Finanzas**. En UI usamos **"Diplomaturas"**; el backend sigue llamando a la entidad `diploma` (endpoints `/api/v1/diplomas`, `/api/v1/diploma-enrollments`, `/api/v1/diploma-settlements`) — **no tocar eso**.

---

## Módulos pendientes (orden recomendado)

### 1. Cursos — completar CRUD
- **Hoy:** read-only. **Falta:** `CourseForm` (create/edit) + `CourseDetail`.
- **Endpoints:** `POST /api/v1/courses`, `PUT /{id}`, `GET /{id}`.
- **Types:** ampliar [`src/types/course.ts`](src/types/course.ts) con `CourseCreateRequest`, `CourseUpdateRequest`.
- **Campos:** `name*`, `code`, `modality` (PRESENCIAL|VIRTUAL|HIBRIDO), `businessUnit*`, `examDate` (LocalDate), `enrollmentPrice`, `coursePrice`, `active`.
- **Sort default:** `name asc`. **Buscador:** nombre, código, modalidad.

### 2. Inscripciones
- **Endpoint:** `GET/POST /api/v1/enrollments` (filtros `studentId`, `courseId`, `status`, `enrolledBy`, `cohort`, `from`, `to`), `GET /{id}`, `PUT /{id}/status`.
- **Type:** nuevo `src/types/enrollment.ts`.
- **Campos:** `studentId*` (autocomplete alumnos), `courseId*` (select cursos), `cohort` (año), `status` (ACTIVA|SUSPENDIDA|COMPLETADA|CANCELADA), `discountCampaignId?`, `startDate`, `enrolledBy` (auto = JWT `sub`).
- **Sort default:** `createdAt desc`. **Buscador:** apellido alumno / curso.
- **Regla importante:** crear una inscripción dispara en el backend la generación automática del cronograma de cuotas. El SPA no genera cuotas, solo las consulta.

### 3. Cuotas y Pagos (ruta `/cuotas`)
- **Dos vistas combinadas** (tabs o split): **Cuotas** (read-only listado) + **Pagos** (create + listado).
- **Endpoints:**
  - `GET /api/v1/installments?enrollmentId=&status=&dueFrom=&dueTo=`
  - `GET /api/v1/installments/by-enrollment/{id}`
  - `PUT /api/v1/installments/{id}/waive-surcharge` (admin)
  - `POST /api/v1/payments` (body: `installmentId?`, `enrollmentId?`, `amount`, `paymentMethod`)
  - `GET /api/v1/payments?...`
- **Campos cuota:** `number`, `dueDate`, `baseAmount`, `surcharge` (5% auto si >día 10), `totalDue`, `status` (PENDING|PAID|OVERDUE|SUSPENDED), `paidAt`, `moodleSuspended` (flag día 22).
- **Campos pago:** `receiptNumber` (auto server-side, `IMD-YYYYMMDD-XXXXXX`), `paymentMethod` (7 valores incluye `OTRO`), `amount`, `paymentDate`.
- **Sort default cuotas:** `dueDate asc`. **Sort default pagos:** `paymentDate desc`.

### 4. Descuentos
- **Endpoint:** `GET/POST/PUT /api/v1/discount-campaigns`.
- **Campos:** `name*`, `discountType` (PERCENTAGE|FIXED), `value*` (≤100 si PERCENTAGE), `validFrom`, `validTo`, `active`.
- **Sort default:** `name asc`.

### 5. Diplomaturas (ex Diplomas) — sección Finanzas
- **Endpoints (backend sigue usando `diploma*`):**
  - `GET/POST/PUT/DELETE /api/v1/diplomas`
  - `GET/POST /api/v1/diploma-enrollments` + `PUT /{id}/status`
- **Campos Diplomatura:** `name*`, `universityName*`, `enrollmentPrice`, `coursePrice`, `taxCommissionPct`, `secretarySalary`, `advertisingAmount`, `adminPct`, `universityPct`, `imedbaPct`, `partnersConfig` (JSONB, array `{name, pct}`), `active`.
- **Validación form:** `adminPct + universityPct + imedbaPct + Σ partnersConfig.pct ≤ 100` (el backend valida igual, pero evitar round-trip).
- **Sub-vista:** "Inscriptos a la diplomatura X" → tabla con `diploma_enrollments` filtrado por `diplomaId`.
- **Sort default:** `name asc`. **Type:** `src/types/diploma.ts`.
- **UI label:** **"Diplomaturas"** (en el menú y títulos). No decir "Diplomas" en el frontend.

### 6. Liquidaciones — sección Finanzas
- **Endpoints:** `GET/POST /api/v1/diploma-settlements?diplomaId=`, `PUT /{id}/recompute` (sólo DRAFT), `PUT /{id}/approve`, `PUT /{id}/mark-paid`.
- **Campos:** `diplomaId*`, `periodYear*`, `periodMonth*` (1–12), `totalCollected`, `taxAmount`, `secretaryAmount`, `advertisingAmount`, `adminAmount`, `universityAmount`, `imedbaAmount`, `partnersDistribution` (snapshot JSONB), `status` (DRAFT|APPROVED|PAID).
- **UI:** state machine visual — botones condicionales por status:
  - DRAFT → `Recomputar`, `Aprobar`
  - APPROVED → `Marcar pagada`
  - PAID → solo lectura
- **Tabla de socias:** mostrar `partnersDistribution` con columna "pagada" (hoy el toggle no persiste server-side, dejar TODO con comentario explícito).
- **Regla:** el reparto es snapshot al crear — cambios en `partnersConfig` de la Diplomatura NO afectan liquidaciones aprobadas. Dejarlo claro en el UI.
- **Sort default:** `periodYear desc, periodMonth desc`.

### 7. Presupuesto (dashboard + entries)
- **Endpoints:**
  - `GET /api/v1/budget/dashboard/summary?year=&month=`
  - `GET /api/v1/budget/dashboard/breakdown?year=&month=`
  - `GET /api/v1/budget/dashboard/monthly-flow?year=` (12 meses zero-filled)
  - `GET/POST /api/v1/budget/entries`
- **Layout:** KPIs arriba (Ingresos / Egresos / Balance / Proyectado) + gráfico flujo anual (Recharts o Chart.js — decidir) + tabla entries con filtros.
- **Create manual:** `entryType` (INCOME|EXPENSE), `category` (7 valores), `businessUnit` (5 valores), `amount`, `entryDate`, `isProjected`, `contactId?`, `subcategory`, `notes`.
- **Info importante:** al registrar un Payment o BookSale, el backend **auto-crea** un BudgetEntry (idempotente). El SPA no debe duplicar eso.
- **Sort entries default:** `entryDate desc`.

### 8. Contactos
- **Endpoint:** `GET/POST/PUT/DELETE /api/v1/contacts` (filtros `type`, `active`, `q`).
- **Campos:** `contactType*` (EMPLEADO|PROVEEDOR), `firstName`, `lastName`, `companyName`, `email`, `phone`, `address`, `active`.
- **Validación:** EMPLEADO exige `firstName+lastName`; PROVEEDOR exige `companyName` (CHECK DB side, replicar client-side).
- **Sort default:** `lastName asc` (fallback `companyName asc` para proveedores).

### 9. Autores / Libros / Ventas (Editorial)
- **Autores:** CRUD, sort `lastName asc`. Endpoints `/api/v1/authors`.
- **Libros:** lista con filtro `specialty`, `branch`, `active`. Stock con contador visual (badge rojo si =0). Tab "Autores" con royalty% por autor. Endpoints `/api/v1/books`, `POST/DELETE /{id}/authors`.
- **Ventas:** lista append-only (sin update/delete). Create con `applyStudentDiscount=true` → 30% off si `studentId` presente. Endpoint `/api/v1/book-sales`. Sub-vista "Royalties del mes": `GET /book-sales/royalties/by-period?year=&month=`.

### 10. Personal (Staff) + Horas + Tipos de actividad
- **Personal:** `/api/v1/staff` (filtros `type=DOCENTE|TUTORA|PRECEPTORA`, `active`, `q`). Sort `lastName asc`.
- **Horas:** `/api/v1/hour-logs` (filtros `staffId`, `year`, `month`, `status`, `activityType`). Flujo facturación: `PENDING → INVOICE_RECEIVED → PAID`. Botones condicionales `PUT /{id}/invoice-sent`, `PUT /{id}/invoice-received` (body `{filePath}`), `PUT /{id}/mark-paid`.
- **Regla al crear hour log:** o `activityTypeId` (copia name+rate del catálogo, `ratePerHour` opcional como override), o `activityType` texto libre + `ratePerHour` obligatorio. **Validar en el form.**
- **Tipos de actividad:** no tiene vista propia — se gestionan desde un select dentro del HourLogForm. Si crece, crear `/api/v1/activity-types` como sub-sección de Administración.

### 11. Notificaciones
- **Endpoint:** `GET /api/v1/notifications` (read-only listado), `POST /{id}/retry`, `POST /{id}/cancel`.
- **Filtros:** `status` (QUEUED|SENT|FAILED|CANCELLED), `type` (CONTRACT|WELCOME|PAYMENT_RECEIPT|INSTALLMENT_DUE_SOON|PRE_SUSPENSION|SUSPENDED|MOODLE_SYNC).
- **Sort default:** `createdAt desc`.
- **UI:** chips de filtro por status + tabla con chip coloreado (amarillo QUEUED, verde SENT, rojo FAILED, gris CANCELLED). Botón acción condicional por status (retry solo en FAILED, cancel solo en QUEUED).

---

## Mocks — patrón a seguir para cada módulo nuevo

En [`src/api/mock/handlers.ts`](src/api/mock/handlers.ts):
1. Agregar data seed en `src/api/mock/<modulo>.data.ts`.
2. Routear GET/POST/PUT/DELETE usando `buildPage<T>` para respuestas paginadas (ya existe, genérico).
3. Reusar `applySort` — soporta string, number, boolean.
4. `VITE_USE_MOCK=true` en `.env` activa todo. Para cortar, `VITE_USE_MOCK=false` + `VITE_API_URL=http://localhost:8080/api/v1`.

---

## Autoridades Keycloak (para cuando se integre JWT real)

| Módulo | Authorities |
|---|---|
| Alumnos | `students:read`, `students:write` |
| Cursos | `courses:read`, `courses:write` |
| Inscripciones | `enrollments:read`, `enrollments:write` |
| Cuotas/Pagos | `installments:read/write`, `payments:read/write` |
| Descuentos | `discount_campaigns:read/write` |
| Diplomaturas/Liquidaciones | `diplomas:read`, `diplomas:write` |
| Presupuesto/Contactos | `budget:read/write`, `contacts:read/write` |
| Editorial | `authors:read/write`, `books:read/write`, `book_sales:read/write` |
| Personal/Horas | `staff:read/write`, `hour_logs:read/write` |
| Notificaciones | `notifications:read/write` |

La vendedora sólo ve inscripciones donde `enrolledBy = current_user_id` — cuando se active JWT real, aplicar el filtro del lado server; el SPA no tiene que implementarlo. En UI, esconder el selector "vendedora" del filtro si el rol es `ROLE_vendedora`.

---

## Al cerrar cada módulo

1. Entrada al [`instrucciones_claude/DIARIO.md`](../instrucciones_claude/DIARIO.md) como `Fran — frontend` con formato del header del archivo (qué / por qué / problemas / impacto / refs).
2. Actualizar **solo la sección de Fran** en [`instrucciones_claude/ESTADO.md`](../instrucciones_claude/ESTADO.md) (sobreescribir, no appendear).
3. **Nunca** tocar archivos fuera de `frontend/` sin pedido explícito del usuario (regla de `CLAUDE.md`).
