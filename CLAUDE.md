# IMEDBA — Guía para Claude Code

## Propiedad del repo (NO TOCAR frontend)

Este monorepo lo construyen dos personas:

- **`backend/`, `docker-compose*.yml`, `keycloak/`, `nginx/`, `scripts/`, `Makefile`, `.env.example`, raíz (README, CLAUDE.md)** → **Santi** (backend / DevOps / DB / Keycloak).
- **`frontend/`** → **Socio** (React 18+/TS/Vite). **READ-ONLY** desde el lado de Claude. Nunca editar, crear ni borrar archivos dentro de `frontend/`. Está permitido leerlo para entender los contratos de API que espera la SPA.

Si una tarea implica modificar `frontend/`, **parar y avisar** al usuario antes de tocar nada.

## Stack (no negociable)

- Backend: Java 21 + Spring Boot 3.3.x + Spring Data JPA + Flyway + MapStruct + Spring Security OAuth2 Resource Server.
- DB: PostgreSQL 16.
- Auth: Keycloak 25 (OIDC/JWT). Realm `imedba`. Clients `imedba-frontend` (public SPA) e `imedba-backend` (confidential resource server).
- Frontend: React 18+/TS/Vite (propiedad del socio).
- Infra: Docker + Docker Compose. Don Web en producción.
- Email: SendGrid API v3.
- LMS: Moodle (integración REST, fase futura).

## Convenciones backend

- Paquete base: `com.imedba`.
- Cada módulo (en `modules/<nombre>/`) con subpaquetes `entity/ repository/ service/ controller/ dto/`.
- `BaseEntity` con `id (UUID) / createdAt / updatedAt / createdBy / deletedAt` (soft delete).
- DTOs: `CreateXxxRequest`, `UpdateXxxRequest`, `XxxResponse`. Mapeos con MapStruct.
- Paginación con `Pageable` y respuesta `PageResponse<T>`.
- Autorización por `@PreAuthorize("hasAuthority('<permiso>')")`.
- DB naming: snake_case. UUIDs en PKs. Migraciones Flyway `V00N__descripcion.sql`.
- Enums (en código y VARCHAR en DB) para: payment_method, status, category, entry_type, staff_type, notification_type.
- Nunca `DELETE` físico: setear `deleted_at`.

## Entidades

18 entidades, ver `instrucciones_claude/02-entidad-relacion.md` (DDL completo). Auxiliares: `branches`, `activity_types`.

## Reglas de negocio clave

- Cuotas: día 1–10 sin recargo → día 11+ recargo 5% → día 20 notificación suspensión → día 22 suspende Moodle.
- Vendedora: solo ve sus inscripciones (`enrolled_by = current_user_id` en Keycloak).
- Libros: descuento 30% alumnos, stock se descuenta al vender.
- Autorías: cálculo on-the-fly (sin tabla `royalty_calculations`).
- Liquidación diplomas: cobrado → impuestos → secretaria → admin → universidad → socias (config en `diplomas`, distribución en JSONB).

## Fases

0. Infra (Docker + Keycloak + BaseEntity + Security) ← **en curso**
1. Students + Courses + Enrollments
2. Installments + Payments + DiscountCampaigns
3. Notifications (SendGrid + alertas + contratos)
4. Books + Sales + Authors
5. Budget + dashboard financiero
6. Staff + HourLogs + Diplomas + Settlements
7. Moodle (futura)
8. Hardening + deploy

## Referencias

- `instrucciones_claude/01-arquitectura-sistema.md`
- `instrucciones_claude/02-entidad-relacion.md` (DDL de las 18 entidades)
- `instrucciones_claude/03-reglas-negocio-pendientes.md`
- `instrucciones_claude/04-plan-de-fases.md`
- `instrucciones_claude/05-moodle-integration-spec.md`
- `instrucciones_claude/06-api-endpoints.md`
- `instrucciones_claude/09-claude-code-instructions.md`

## Comandos comunes

- `make up` / `make down` / `make logs` — ciclo Docker Compose.
- `make psql` — shell contra la DB app.
- `make kc-shell` — shell del contenedor Keycloak.
- `make backend-dev` — Spring Boot con perfil `dev` (fuera de Docker, contra Postgres+Keycloak dockerizados).
- `make backend-test` — tests con Testcontainers.

## Secretos

- No commitear `.env`. Usar `.env.example` como plantilla.
- Secretos (JWT, SendGrid API key, passwords DB/Keycloak) siempre por variable de entorno. En prod: secret manager del hosting.
