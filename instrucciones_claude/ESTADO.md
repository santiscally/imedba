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

**Fase actual:** 8 — cerrada a nivel infra/backend (hardening + deploy). Próxima: deploy real a Don Web y/o Fase 7 (Moodle) diferida.

**En qué estoy ahora:**
- Fase 8 completa a nivel código e infra. `application-prod.yml` con swagger off, actuator restringido, Hikari/Tomcat tuning, logging. `SecurityConfig` emite X-Frame-Options=DENY + X-Content-Type-Options + Referrer-Policy + Permissions-Policy + CSP api-apta, y gatea swagger por `springdoc.api-docs.enabled`. Nginx con CSP explícito para el SPA, X-Frame-Options, Permissions-Policy, `server_tokens off`, rate limit 20 req/s por IP en `/api/` y 5 req/s en el token endpoint de Keycloak. Scripts `backup-db.sh` (pg_dump + gzip + rotación 30d+12m) y `restore-db.sh` (destructivo, con confirmación). `.github/workflows/backend-ci.yml` con Java 21 + maven cache + compile+test y upload de surefire-reports. `docker-compose.prod.yml` con deploy.resources.limits, healthcheck backend `/actuator/health/readiness`, JAVA_OPTS con MaxRAMPercentage=75. 50/50 unit tests siguen verde tras los cambios.
- Fases 0-6 cerradas. Integration tests Testcontainers de Fase 2/3 siguen pendientes de corrida host (DinD en alpine JDK no sirve para Testcontainers).

**Próximo paso:**
- Deploy real a Don Web: copiar repo, setear `.env` de prod (SERVER_NAME, KEYCLOAK_HOSTNAME, KEYCLOAK_ISSUER_URI=https://..., KEYCLOAK_JWK_SET_URI=http://keycloak:8080/..., SERVER_NAME del dominio, POSTGRES_PASSWORD real, SENDGRID_API_KEY), certbot para cert inicial a `nginx/certs/`, `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`, y luego agregar cron del backup.
- Cuando el socio confirme que el SPA no usa scripts/estilos inline externos, apretar CSP quitando `'unsafe-inline'`.
- Fase 7 (Moodle) queda diferida para post-deploy — el stack no la necesita para salir.
- Si se toca host: correr los integration tests Testcontainers acumulados (Student/Course/Enrollment/Payment API).

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
