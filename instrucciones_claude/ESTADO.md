# ESTADO — Snapshot de trabajo en curso

> **Qué es esto.** Foto corta y actualizable de **en qué está cada uno ahora mismo**. No es historia (eso va en `DIARIO.md`), es el presente.
>
> **Regla de uso para el Claude activo:**
> - **Solo tocar la sección del dueño activo.** Santi edita "Santi / backend", el Fran edita "Fran / frontend". Nunca tocar la sección del otro (evita merge conflicts).
> - **Sobreescribir, no appendear.** Esta es una foto, no un log.
> - Actualizar al **empezar** una tarea nueva y al **terminarla**.
> - Si algo está **bloqueado esperando al otro**, dejarlo explícito en la sub-sección "Bloqueado por el otro".

---

## Santi / backend / infra / db / auth

**Fase actual:** 8 — cerrada a nivel infra/backend (hardening + deploy). Próxima: deploy real a Don Web y/o Fase 7 (Moodle) diferida.

**En qué estoy ahora:**
- Fase 8 completa a nivel código e infra. `application-prod.yml` con swagger off, actuator restringido, Hikari/Tomcat tuning, logging. `SecurityConfig` emite X-Frame-Options=DENY + X-Content-Type-Options + Referrer-Policy + Permissions-Policy + CSP api-apta, y gatea swagger por `springdoc.api-docs.enabled`. Nginx con CSP explícito para el SPA, X-Frame-Options, Permissions-Policy, `server_tokens off`, rate limit 20 req/s por IP en `/api/` y 5 req/s en el token endpoint de Keycloak. Scripts `backup-db.sh` (pg_dump + gzip + rotación 30d+12m) y `restore-db.sh` (destructivo, con confirmación). `.github/workflows/backend-ci.yml` con Java 21 + maven cache + compile+test y upload de surefire-reports. `docker-compose.prod.yml` con deploy.resources.limits, healthcheck backend `/actuator/health/readiness`, JAVA_OPTS con MaxRAMPercentage=75. 50/50 unit tests siguen verde tras los cambios.
- Fases 0-6 cerradas. Integration tests Testcontainers de Fase 2/3 siguen pendientes de corrida host (DinD en alpine JDK no sirve para Testcontainers).

**Próximo paso:**
- **Fase 7 (Moodle) como drop-in** detrás de feature flag `MOODLE_ENABLED=false` (default). Implementar ahora: cliente REST genérico contra la API estándar de Moodle Web Services (funciones `core_user_*` y `enrol_manual_*` — estables desde Moodle 2.0/3.0, siguen vivas en 4.1/4.3/4.5/5.0; Moodle 5.0 removió pre-4.0 deprecadas, pero las nuestras no están afectadas). Migración `V015__moodle_mappings.sql`: `students.moodle_user_id INTEGER NULL` y `courses.moodle_course_id INTEGER NULL` (IMEDBA mantiene sus UUIDs como source of truth; el id de Moodle es un side-link que se puebla en el primer sync y puede quedar null para cursos/alumnos sin LMS). Env vars: `MOODLE_URL`, `MOODLE_TOKEN`, `MOODLE_DEFAULT_STUDENT_ROLE_ID=5`, `MOODLE_ENABLED`. Hooks silenciosos (no-op cuando `enabled=false`) en `EnrollmentService` (crear+inscribir al activar), `InstallmentScheduler` (suspend=1 al día 22) y `PaymentService` (suspend=0 al regularizar). Notifications de tipo `MOODLE_SYNC` para log de operaciones. Tests unitarios del client con WireMock o MockWebServer contra fixtures JSON. Cuando IMEDBA tenga el token + course IDs, la activación es setear env vars + poblar mapeo. Queda codeado, testeado y mergeable sin romper prod.
- Deploy real a Don Web: copiar repo, setear `.env` de prod (SERVER_NAME, KEYCLOAK_HOSTNAME, KEYCLOAK_ISSUER_URI=https://..., KEYCLOAK_JWK_SET_URI=http://keycloak:8080/..., SERVER_NAME del dominio, POSTGRES_PASSWORD real, SENDGRID_API_KEY), certbot para cert inicial a `nginx/certs/`, `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`, y luego agregar cron del backup.
- Cuando el Fran confirme que el SPA no usa scripts/estilos inline externos, apretar CSP quitando `'unsafe-inline'`.
- Si se toca host: correr los integration tests Testcontainers acumulados (Student/Course/Enrollment/Payment API).

**Bloqueado por el otro:** nada.

**Notas para el Fran:**
- El backend expone Swagger en `http://localhost:8080/swagger-ui.html`. Usar ese contrato como fuente de verdad para el SPA.
- Endpoints nuevos de Fase 6:
  - `GET/POST /api/v1/staff` (filtros `type=DOCENTE|TUTORA|PRECEPTORA`, `active`, `q`), `GET/PUT/DELETE /api/v1/staff/{id}`.
  - `GET/POST /api/v1/activity-types` (filtro `activeOnly`), `GET/PUT/DELETE /api/v1/activity-types/{id}`.
  - `GET/POST /api/v1/hour-logs` (filtros `staffId`, `year`, `month`, `status`, `activityType`, page/size), `GET /api/v1/hour-logs/{id}`, `PUT /api/v1/hour-logs/{id}/invoice-sent`, `PUT /api/v1/hour-logs/{id}/invoice-received` (body `{filePath}`), `PUT /api/v1/hour-logs/{id}/mark-paid`.
  - `GET/POST /api/v1/diplomas` (filtros `q`, `active`), `GET/PUT/DELETE /api/v1/diplomas/{id}`.
  - `GET/POST /api/v1/diploma-enrollments` (filtros `diplomaId`, `studentId`, `status`), `GET /api/v1/diploma-enrollments/{id}`, `PUT /api/v1/diploma-enrollments/{id}/status`.
  - `GET/POST /api/v1/diploma-settlements` (filtro `diplomaId`), `GET /api/v1/diploma-settlements/{id}`, `PUT /api/v1/diploma-settlements/{id}/recompute` (sólo DRAFT), `PUT /api/v1/diploma-settlements/{id}/approve`, `PUT /api/v1/diploma-settlements/{id}/mark-paid`.
  - Autoridades Keycloak nuevas a sumar: `staff:read`, `staff:write`, `hour_logs:read`, `hour_logs:write`, `diplomas:read`, `diplomas:write`.
  - **HourLog — regla de negocio al crear:** o mandás `activityTypeId` (se copia name+rate del catálogo; `ratePerHour` es opcional como override) o mandás `activityType` texto libre + `ratePerHour` obligatorio.
  - **DiplomaSettlement — state machine:** sólo se puede editar/recalcular en DRAFT; una vez APPROVED queda frozen. El reparto de socias es snapshot al crear — cambios en `partners_config` del Diploma NO tocan liquidaciones pasadas.
- Endpoints previos (Fase 2/3/4/5) siguen vigentes: `/api/v1/installments`, `/api/v1/payments`, `/api/v1/discount-campaigns`, `/api/v1/notifications`, `/api/v1/authors`, `/api/v1/books`, `/api/v1/book-sales`, `/api/v1/contacts`, `/api/v1/budget/**`.
- Usuarios de prueba en Keycloak (password `test1234`): `admin@imedba.dev`, `vendedora@imedba.dev`, `secretaria@imedba.dev`, `editorial@imedba.dev`, `contable@imedba.dev`, `viewer@imedba.dev`.

---

## Fran / frontend

**Fase actual:** SPA — Fase 1 cerrada (Alumnos CRUD + Cursos listado). Sidebar reorganizado. `frontend/ROADMAP.md` escrito para guiar las próximas sesiones.

**En qué estoy ahora:**
- **Alumnos** completo (CRUD + modal form + modal detail + toggle activo).
- **Cursos** como listado (buscador + filtro `businessUnit` + sort + paginación); **falta CourseForm + CourseDetail** — próximo paso.
- **Sidebar reorganizado:** sección `Diplomas` eliminada; `Diplomaturas` (ex `Diplomas` en UI) + `Liquidaciones` movidas a **Finanzas**. Rutas `/diplomaturas` y `/liquidaciones` registradas en App.tsx (placeholder por ahora). Backend sigue usando `/api/v1/diplomas` — **solo cambia el label/ruta del SPA**.
- **ROADMAP** en `frontend/ROADMAP.md`: patrón UX canónico + lista ordenada de 11 módulos pendientes con endpoints, campos, sort default, validaciones y mocks a extender. Pensado para que cualquier sesión de Claude entre en frío y sepa exactamente qué construir.
- Capa mock (`src/api/mock/handlers.ts`) sigue activa con `VITE_USE_MOCK=true`.

**Próximo paso:**
- Completar CRUD de **Cursos** (CourseForm create/edit + CourseDetail) siguiendo el patrón Alumnos.
- Después: **Inscripciones** (`/api/v1/enrollments`) — crear enrollment dispara la generación automática del cronograma de cuotas server-side, el SPA solo consulta.
- Orden completo: ver `frontend/ROADMAP.md`.

**Bloqueado por el otro:** nada. Backend Fases 1–8 expuesto en Swagger `localhost:8080/swagger-ui.html`.

**Notas para Santi:**
- Sección `Diplomas` eliminada del Sidebar del SPA. Ruta `/diplomas` ya no existe en el front — si alguien la linkea desde email/notificación, redirigir a `/diplomaturas`. Endpoints backend intactos.
- Los mocks siguen esperando `200` en GET vacío (no 204) para no romper `.json()`.
- `Course.examDate` se parsea manual con `split('-')` (LocalDate sin TZ shifting).
- `BusinessUnit` tipado como `'RESIDENCIAS' | 'PREMATUROS' | 'EDITORIAL' | 'FORMACION_SUPERIOR' | 'OTROS'` — avisame si agregás un valor al enum backend.
- Campos del Excel aún sin modelar en Student: `interview_status`, `Ausente plat NOV/ENE`, `Pago chq` — quedan como nota amarilla en el form.
