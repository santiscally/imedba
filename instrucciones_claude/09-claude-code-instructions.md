# Instrucciones para Claude Code - Proyecto IMEDBA

## Contexto

Backoffice web para IMEDBA (instituto de educación médica). Reemplaza múltiples Excel. Proyecto chico/mediano.

## Stack (NO NEGOCIABLE)

- **Frontend**: React 18+ / TypeScript / Vite / React Router v6
- **Backend**: Java 21 + Spring Boot 3.3+ / Spring Data JPA / Flyway / MapStruct
- **DB**: PostgreSQL 16
- **Auth**: Keycloak 25+ (OIDC/JWT)
- **Infra**: Docker + Docker Compose
- **Email**: SendGrid API v3

## Entidades (18 totales)

```
students, courses, enrollments, discount_campaigns,
installments, payments, books, book_sales, authors, book_authors,
diplomas, diploma_enrollments, diploma_settlements,
staff, hour_logs, budget_entries, contacts, notifications
+ auxiliares: branches, activity_types
```

**Principio clave**: Si algo puede ser un campo VARCHAR o enum, NO hagas tabla. Tablas solo para entidades con vida propia y relaciones.

## Estructura Backend

```
src/main/java/com/imedba/
├── config/           # Security, CORS, SendGrid
├── common/           # BaseEntity, PageResponse, ExceptionHandler
├── modules/
│   ├── student/      │ course/      │ enrollment/   │ installment/
│   ├── payment/      │ discount/    │ book/         │ diploma/
│   ├── staff/        │ hourlog/     │ budget/       │ contact/
│   ├── notification/ │ branch/
└── scheduler/        # InstallmentScheduler, ReminderScheduler
```

Cada módulo: `entity/ → repository/ → service/ → controller/ → dto/`

## Convenciones

- **BaseEntity**: id (UUID), createdAt, updatedAt, createdBy, deletedAt
- **Soft delete**: `deletedAt TIMESTAMP NULL`. Nunca DELETE físico.
- **DTOs**: `CreateXxxRequest`, `UpdateXxxRequest`, `XxxResponse`. MapStruct.
- **Paginación**: Todos los listados con `Pageable` → `Page<T>`.
- **Seguridad**: `@PreAuthorize("hasAuthority('permiso')")` en controllers.
- **BD naming**: snake_case. UUIDs para PKs. Flyway migrations `V001__xxx.sql`.
- **Enums en vez de tablas para**: payment_method, status, category, entry_type, staff_type, notification_type.

## Reglas de Negocio

**Cuotas**: Día 1-10 sin recargo → día 11+ recargo 5% → día 20 notificación suspensión → día 22 suspende Moodle.

**Vendedora**: Solo ve sus inscripciones (`enrolled_by = current_user_id`).

**Libros**: Descuento 30% alumnos. Al vender → descontar stock.

**Autorías**: % fijo por autor × ventas del mes. Cálculo on-the-fly, no tabla separada.

**Liquidación diplomas**: Cobrado → menos impuestos → menos secretaria → menos admin → menos universidad → socias. Config en campos de `diplomas`, distribución socias en JSONB de `diploma_settlements`.

## Keycloak

Realm: `imedba`. Client SPA: `imedba-frontend` (public). Client API: `imedba-backend` (confidential).

Roles: `ADMIN, VENDEDORA, SECRETARIA_FS, EDITORIAL, CONTABLE, VIEWER`

## Orden de Implementación

1. Infra (Docker, Keycloak, BaseEntity, Security)
2. Students + Courses + Enrollments
3. Installments + Payments + Discount Campaigns
4. Notifications (SendGrid + alertas)
5. Books + Sales + Authors
6. Budget (entries unificadas + dashboard)
7. Staff + Hour Logs + Diplomas + Settlements
8. Integración Moodle (fase futura)

## Docs de Referencia

- `01-arquitectura-sistema.md`
- `02-entidad-relacion.md` ← DDL completo de las 18 entidades
- `03-reglas-negocio-pendientes.md`
- `04-plan-de-fases.md`
- `05-moodle-integration-spec.md`
- `06-api-endpoints.md`
