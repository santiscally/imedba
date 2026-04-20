# IMEDBA — Guía para Claude Code

## Propiedad del repo

Este monorepo lo construyen dos personas:

- **`backend/`, `docker-compose*.yml`, `keycloak/`, `nginx/`, `db/`, `scripts/`, `.env.example`, raíz (README, CLAUDE.md)** → **Santi** (backend / DevOps / DB / Keycloak).
- **`frontend/`** → **Socio** (React 18+/TS/Vite). No tocar salvo pedido explícito del usuario. Leerlo está permitido.

Si una tarea implica modificar `frontend/` sin pedido explícito, **parar y avisar** antes de tocar nada.

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

## Coordinación entre los dos Claudes (Santi + socio)

Dos personas trabajan en este repo con dos Claudes distintos. Para que no se pisen ni re-descubran cosas ya resueltas:

- **`instrucciones_claude/DIARIO.md`** — bitácora append-only. Al **cerrar una tarea no trivial** (feature, bug-fix, decisión arquitectónica, fix de build, cambio en infra), agregar una entrada con el formato del header del archivo. Al **arrancar sesión**, leer las últimas ~10 entradas.
- **`instrucciones_claude/ESTADO.md`** — snapshot del presente. Dos secciones separadas ("Santi / backend" y "Socio / frontend"). **Solo editar la sección del dueño activo.** Jamás tocar la sección del otro (causa merge conflicts). Al empezar/terminar tarea, sobreescribir la sección propia.
- **`PROMPT-BOOTSTRAP.md`** — prompt one-shot para que el Claude del otro dev quede sincronizado con las mismas reglas. Se corre una sola vez por máquina.
- **`instrucciones_claude/00-setup-claude.md`** — instructivo humano de setup y convención de uso.

Reglas duras:
- Si te piden tocar archivos fuera del área de propiedad del usuario activo, **parar y avisar** antes de modificar nada.
- No editar entradas viejas del DIARIO. Si algo cambió, agregar entrada nueva de "corrección".
- Respuestas concisas. Si algo se dice en 2 líneas, no decirlo en 10.

## Referencias

- `instrucciones_claude/00-setup-claude.md` — setup y convención de trabajo entre dos Claudes
- `instrucciones_claude/DIARIO.md` — bitácora compartida append-only
- `instrucciones_claude/ESTADO.md` — snapshot de trabajo en curso
- `PROMPT-BOOTSTRAP.md` — prompt de bootstrap para el segundo dev
- `instrucciones_claude/01-arquitectura-sistema.md`
- `instrucciones_claude/02-entidad-relacion.md` (DDL de las 18 entidades)
- `instrucciones_claude/03-reglas-negocio-pendientes.md`
- `instrucciones_claude/04-plan-de-fases.md`
- `instrucciones_claude/05-moodle-integration-spec.md`
- `instrucciones_claude/06-api-endpoints.md`
- `instrucciones_claude/09-claude-code-instructions.md`

## Comandos comunes

- `docker compose up -d --build` / `docker compose down` / `docker compose logs -f --tail=200` — ciclo dev.
- `docker compose down -v` — reset total (borra volúmenes, vuelve a correr init scripts de Postgres).
- `docker compose exec db psql -U imedba -d imedba` — shell psql.
- `docker compose exec keycloak sh` — shell del contenedor Keycloak.
- `cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` — backend fuera de Docker.
- `cd backend && ./mvnw test` — tests locales (requiere Java 21 en el host).
- Prod: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`.

## Secretos

- No commitear `.env`. Usar `.env.example` como plantilla.
- Secretos (JWT, SendGrid API key, passwords DB/Keycloak) siempre por variable de entorno. En prod: secret manager del hosting.
