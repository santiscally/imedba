# Arquitectura del Sistema de Gestión Interna - IMEDBA

## 1. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18+ / TypeScript / Vite |
| Backend | Java 21 + Spring Boot 3.3+ |
| Base de Datos | PostgreSQL 16 |
| Autenticación | Keycloak 25+ |
| Containerización | Docker + Docker Compose |
| Email | SendGrid API v3 |
| LMS | Moodle (integración REST, fase futura) |
| Hosting | Don Web |

## 2. Arquitectura

```
┌──────────────────────────────────────────────┐
│              Browser (React SPA)             │
└─────────────────────┬────────────────────────┘
                      │ HTTPS
                      ▼
┌──────────────────────────────────────────────┐
│           Nginx (Reverse Proxy + SSL)        │
├──────────┬──────────────────────┬────────────┤
│  /api/*  │       /auth/*        │   /* SPA   │
│          ▼                      ▼            │
│  ┌──────────────┐   ┌────────────────┐       │
│  │ Spring Boot  │◄─►│   Keycloak     │       │
│  │   Backend    │JWT│  Auth Server   │       │
│  └──────┬───────┘   └───────┬────────┘       │
│         │                   │                │
│         ▼                   ▼                │
│  ┌──────────────┐   ┌────────────────┐       │
│  │ PostgreSQL   │   │  PostgreSQL    │       │
│  │ (App DB)     │   │ (Keycloak DB)  │       │
│  └──────────────┘   └────────────────┘       │
│                                              │
│    Externos: SendGrid │ Moodle API │ wa.me   │
└──────────────────────────────────────────────┘
```

## 3. Docker Compose

Servicios: `nginx`, `frontend`, `backend`, `keycloak`, `db`, `keycloak-db`

PostgreSQL app en 5432, Keycloak DB en 5433. Volúmenes persistentes para ambos.

## 4. Estructura Backend (simplificada)

```
backend/src/main/java/com/imedba/
├── config/
│   ├── SecurityConfig.java
│   ├── CorsConfig.java
│   └── SendGridConfig.java
├── common/
│   ├── BaseEntity.java           # id, createdAt, updatedAt, createdBy, deletedAt
│   ├── PageResponse.java
│   └── GlobalExceptionHandler.java
├── modules/
│   ├── student/                  # Student entity + CRUD
│   ├── course/                   # Course entity + CRUD
│   ├── enrollment/               # Enrollment (incluye plan de pago)
│   ├── installment/              # Cuotas
│   ├── payment/                  # Pagos (incluye recibo)
│   ├── discount/                 # Campañas de descuento
│   ├── book/                     # Book + BookSale + Author + BookAuthor
│   ├── diploma/                  # Diploma + DiplomaEnrollment + DiplomaSettlement
│   ├── staff/                    # Staff (docentes + tutoras unificados)
│   ├── hourlog/                  # HourLog + ActivityType
│   ├── budget/                   # BudgetEntry (ingresos + egresos unificados)
│   ├── contact/                  # Contact (empleados + proveedores)
│   ├── notification/             # Notification + Alert + SendGrid + WhatsApp links
│   └── branch/                   # Branch (sedes)
└── scheduler/
    ├── InstallmentScheduler.java # Alertas + recargos + suspensiones
    └── ReminderScheduler.java    # Recordatorios internos
```

Cada módulo: `entity/ → repository/ → service/ → controller/ → dto/`

## 5. Estructura Frontend

```
frontend/src/
├── config/               # keycloak.ts, api.ts (Axios + JWT)
├── layouts/              # MainLayout (sidebar + header)
├── components/common/    # DataTable, FormDialog, StatusBadge, DashboardCard
├── pages/
│   ├── dashboard/
│   ├── students/         # ABM + detalle
│   ├── courses/          # Catálogo
│   ├── enrollments/      # Inscripciones + cuotas + pagos
│   ├── discounts/        # Campañas
│   ├── editorial/        # Libros + stock + ventas + autorías
│   ├── diplomas/         # Diplomaturas + liquidaciones
│   ├── staff/            # Docentes + tutoras + horas
│   ├── budget/           # Presupuesto + dashboard financiero
│   └── admin/            # Sedes, contactos, alertas, config
├── hooks/                # useAuth, usePermissions
├── services/             # API calls
└── types/                # TypeScript interfaces
```

## 6. Keycloak

Realm: `imedba`

**Roles**: ADMIN, VENDEDORA, SECRETARIA_FS, EDITORIAL, CONTABLE, VIEWER

**Permisos granulares** (asignables a cualquier rol):
```
students:read/write    enrollments:read/write    payments:read/write
courses:read/write     editorial:read/write      stock:read/write
budget:read/write      teaching:read/write       settlements:read/write
notifications:manage   reports:read              admin:manage
```

Vendedora solo ve sus ventas (filtro por `enrolled_by = current_user`).

## 7. Flujos Principales

**Venta**: Vendedora carga alumno → selecciona curso → aplica descuento → define cuotas → genera contrato → envía email → crea inscripción.

**Cobranza**: Scheduler diario → día 8: alerta email → día 11: recargo 5% → día 18: última alerta → día 22: suspensión Moodle.

**Liquidación docentes**: Fin de mes → cargan horas → calcula automático → envía email pidiendo factura.

**Liquidación diplomas**: Fin de mes → suma cobrado → descuenta impuestos/secretaria/admin/universidad → distribuye a socias.

## 8. Integraciones

**SendGrid**: Emails automáticos (bienvenida, vencimientos, recargos, suspensión, solicitud factura). Necesitan: API Key + sender verificado.

**WhatsApp**: Links `wa.me/{numero}?text={mensaje}` generados por el sistema, abiertos manualmente por el admin.

**Moodle (fase futura)**: API REST para crear usuario, inscribir, suspender/reactivar. Ver `05-moodle-integration-spec.md`.
