# ESTADO — Snapshot de trabajo en curso

> **Qué es esto.** Foto corta y actualizable de **en qué está cada uno ahora mismo**. No es historia (eso va en `DIARIO.md`), es el presente.
>
> **Regla de uso para el Claude activo:**
> - **Solo tocar la sección del dueño activo.** Santi edita "Santi / backend", el socio edita "Socio / frontend". Nunca tocar la sección del otro (evita merge conflicts).
> - **Sobreescribir, no appendear.** Esta es una foto, no un log.
> - Actualizar al **empezar** una tarea nueva y al **terminarla**.
> - Si algo está **bloqueado esperando al otro**, dejarlo explícito en la sub-sección "Bloqueado por el otro".

---

## Santi / backend / infra / db / auth

**Fase actual:** 6 — cerrada a nivel código (Docentes + Formación Superior + hour logs + diplomas + settlements). Próxima: Fase 7 (integración Moodle) o Fase 8 (hardening + deploy).

**En qué estoy ahora:**
- Fase 6 completa. **6.a Docentes:** migración `V013__staff_activity_types_hour_logs.sql` + módulos `modules/staff` (DOCENTE/TUTORA/PRECEPTORA, soft delete), `modules/activitytype` (catálogo rate_per_hour, sin soft delete) y `modules/hourlog` (append-only; rate y total snapshot al crear; flujo factura PENDING → INVOICE_RECEIVED → PAID, markPaid exige invoice_received=true). **6.b Formación Superior:** migración `V014__diplomas.sql` + módulos `modules/diploma` (partners_config en JSONB con `@JdbcTypeCode(SqlTypes.JSON)`), `modules/diplomaenrollment` (status ACTIVE/SUSPENDED/COMPLETED/CANCELLED), `modules/diplomasettlement` (state machine DRAFT→APPROVED→PAID, UNIQUE(diploma_id, period_year, period_month) para impedir doble liquidación). Motor `SettlementEngine.compute` puro: tax → fijos (secretaria+publicidad) → % sobre remaining (admin/universidad/imedba) → socias por pct. HALF_UP a 2 decimales; remanente por redondeo queda en partners_total. 50/50 unit tests verde en Java 21 Docker (21 tests nuevos: HourLogServiceTests 7, SettlementEngineTests 7, DiplomaSettlementServiceTests 7). 202 fuentes compilan sin warnings.
- Fases anteriores (0-5) cerradas — integration tests Testcontainers de Fase 2/3 fallan dentro del contenedor Alpine por falta de DinD (no es regresión; corren en host con Docker Desktop).

**Próximo paso:**
- Decidir entre Fase 7 (integración Moodle — spec en `instrucciones_claude/05-moodle-integration-spec.md`) o saltar a Fase 8 (hardening + deploy Don Web) dejando Moodle como trabajo posterior.
- Si se toca host: correr los integration tests Testcontainers acumulados (StudentApi, CourseApi, EnrollmentApi, PaymentApi) — hoy el .jdks del host tiene sólo Java 17, hay que instalar Java 21 o seguir usando el contenedor Alpine pero montando socket Docker.

**Bloqueado por el otro:** nada.

**Notas para el socio:**
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

## Socio / frontend

**Fase actual:** _(pendiente de que el socio actualice)_

**En qué estoy ahora:** _(pendiente)_

**Próximo paso:** _(pendiente)_

**Bloqueado por el otro:** _(pendiente)_

**Notas para Santi:** _(pendiente)_
