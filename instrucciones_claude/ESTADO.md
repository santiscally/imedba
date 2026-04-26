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

**Fase actual:** 8 cerrada. Plan de Fase 9 armado tras reunión IMEDBA 2026-04-24 (ver `07-requerimientos-reunion-20260424.md`). Fase 7 (Moodle) pausada esperando token del programador de Moodle.

**En qué estoy ahora:**
- Fase 8 completa (hardening + deploy): `application-prod.yml` con swagger off + actuator restringido + Hikari/Tomcat tuning. `SecurityConfig` con headers defensivos. Nginx con CSP + rate limit (20 req/s `/api`, 5 req/s token endpoint Keycloak). Scripts `backup-db.sh` / `restore-db.sh`. `.github/workflows/backend-ci.yml`. `docker-compose.prod.yml` con deploy limits + healthcheck.
- Fase 9 planificada post-reunión IMEDBA 2026-04-24. Scope: (a) segmentación Residencias↔Formación Superior por authorities + reubicación de Prematuros como diplomatura dentro de FS + `country` en courses; (b) workflow de aprobación de inscripciones (PENDING_APPROVAL → approve por socio dispara Moodle + contrato + cuotas); (c) entidad Commission para cohortes de diplomatura; (d) RecurringService para abonos con flujo de factura; (e) búsquedas sin tilde. Plan detallado en `04-plan-de-fases.md` §Fase 9.
- Fase 7 (Moodle) — ya le escribí al programador de Moodle (2026-04-24) pidiendo API, API key y documentación. Esperando respuesta. El cliente REST puede empezar a codearse ahora contra la spec estándar; se cablea cuando llega el token.
- Fases 0-6 cerradas. Integration tests Testcontainers pendientes de corrida host.

**Próximo paso:**
- **Arrancar Fase 9.a (segmentación)**: authorities nuevas en Keycloak realm export, migración V016 (eliminar `PREMATUROS` del enum, migrar datos a `FORMACION_SUPERIOR`, agregar `country` a courses, habilitar extension `unaccent`), filtrado server-side en queries de students/courses/enrollments/etc.
- Luego 9.b (workflow aprobación) → 9.c (comisiones) → 9.d (RecurringService) → 9.e (búsquedas unaccent).
- Retomar Fase 7 cuando Moodle responda con token + docs.
- Deploy a Don Web post-Fase 9 (ya está listo infra, sólo setear `.env` de prod + cert).
- Si se toca host: correr integration tests Testcontainers acumulados (Student/Course/Enrollment/Payment API).

**Bloqueado por el otro:** nada.

**Notas para Fran:**
- **⚠️ Reunión IMEDBA 2026-04-24 — LEER ANTES DE SEGUIR TOCANDO EL SPA.** Resumen completo en `instrucciones_claude/07-requerimientos-reunion-20260424.md` y plan de Fase 9 en `04-plan-de-fases.md`. Puntos que te tocan directo:
  1. **Menú se reorganiza**: en vez de "Académico" solo, van a ser DOS entradas "Académico Residencias Médicas" y "Académico Formación Superior". IMEDBA tiene dos equipos separados que no deben verse entre sí — esto no es opcional.
  2. **"Diplomatura" pasa a estar dentro de "Finanzas"** (no como sección propia) — esto ya lo hiciste hoy 👍. "Horas" pasa a "Administración/Personal".
  3. **Prematuros ya no es business_unit paralela**: es una diplomatura dentro de Formación Superior. Si tenés Prematuros como chip/filtro en `Cursos.tsx`, sacalo. El enum pasa a ser `RESIDENCIAS | EDITORIAL | FORMACION_SUPERIOR | GENERAL`. Los datos actuales con `PREMATUROS` van a migrarse a `FORMACION_SUPERIOR` (V016 backend).
  4. **Filtro `country` en courses de Residencias** (Argentina / Uruguay — futuro "Exterior"). Campo nuevo que aparecerá en `CourseResponse`.
  5. **Inscripciones tienen estado `PENDING_APPROVAL`**: la vendedora crea pero queda esperando OK de socio. Necesitás una vista "Pendientes de aprobación" para los socios con botones Aprobar / Rechazar.
  6. **Comisiones en diplomaturas**: al inscribir alumno a diplomatura hay que elegir comisión (secuencial cada 6 meses, la 10 es la actual; la 11 arranca agosto 2026). Endpoint nuevo `/api/v1/commissions`.
  7. **Vista "Abonos"** dentro de Finanzas — agenda mensual de vencimientos de proveedores con flujo de factura (igual UX que hour-logs).
  8. **Búsquedas sin tilde**: el backend normaliza con `unaccent`, vos no tenés que hacer nada especial, pero podés liberar validaciones que exijan tilde.
- Authorities Keycloak nuevas a sumar en los guards/menu del SPA: `residencias:read`, `residencias:write`, `formacion_superior:read`, `formacion_superior:write`, `enrollments:approve`, `recurring_services:read`, `recurring_services:write`. Socios (3 personas, `ROLE_admin`) tienen todas.
- **Próxima reunión**: viernes 15 de mayo 11:00 (fallback 29). Intermedio posible con Meli (socia residencias).
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

**Fase actual:** SPA — Módulo 3 cerrado (**Cuotas y Pagos** con tabs). Próximo: Módulo 4 (Descuentos / DiscountCampaigns).

**En qué estoy ahora:**
- **Alumnos** completo (CRUD + form + detail + toggle activo).
- **Cursos** completo (CRUD + CourseForm sin límite máximo de precio + CourseDetail).
- **Inscripciones** completo (CRUD + EnrollmentForm + EnrollmentDetail; alta dispara generación de cronograma de cuotas server-side, el SPA consulta).
- **Cuotas y Pagos** (`/cuotas`) — página única con dos tabs:
  - Tab **Cuotas**: listado read-only con filtro por estado (TODAS / PENDING / OVERDUE / SUSPENDED / PAID), sort default `dueDate asc`, badges con `moodleSuspended`, acción admin `waive-surcharge` cuando hay recargo y status ≠ PAID, atajo "Registrar pago" desde la fila.
  - Tab **Pagos**: listado con sort default `paymentDate desc`, modal `PaymentDetail` read-only.
  - Botón "Registrar pago" siempre visible; modal `PaymentForm` con dropdown de cuotas pendientes (auto-fill de `amount` desde `totalDue`), `paymentMethod` (7 enum values), `paymentDate` (default hoy), `notes` opcional.
  - Mock: `MOCK_INSTALLMENTS` generado desde 7 inscripciones seed (~37 cuotas con mix de estados); `MOCK_PAYMENTS` derivado de cuotas PAID + 4 pagos de matrícula sueltos (sin `installmentId`). Crear pago marca cuota como PAID en el store mock.
- Capa mock (`src/api/mock/handlers.ts`) sigue activa con `VITE_USE_MOCK=true`.

**Próximo paso:**
- **Módulo 4 — Descuentos** (`/descuentos`, endpoint `/api/v1/discount-campaigns`). CRUD de campañas (nombre, % descuento, fecha desde/hasta, cursos aplicables). Ver `frontend/ROADMAP.md`.
- Después en orden: Diplomaturas, Liquidaciones, Presupuesto, Contactos, Editorial (Libros/Ventas/Autores), Personal+Horas, Notificaciones.

**Bloqueado por el otro:** nada. Backend Fases 1–8 expuesto en Swagger `localhost:8080/swagger-ui.html`.

**Notas para Santi:**
- Sección `Diplomas` eliminada del Sidebar del SPA. Ruta `/diplomas` ya no existe en el front — si alguien la linkea desde email/notificación, redirigir a `/diplomaturas`. Endpoints backend intactos.
- Los mocks siguen esperando `200` en GET vacío (no 204) para no romper `.json()`.
- `Course.examDate` se parsea manual con `split('-')` (LocalDate sin TZ shifting). Ídem `Installment.dueDate` y `Payment.paymentDate`.
- `BusinessUnit` tipado como `'RESIDENCIAS' | 'PREMATUROS' | 'EDITORIAL' | 'FORMACION_SUPERIOR' | 'OTROS'` — avisame si agregás un valor al enum backend.
- `PaymentMethod` espejado: `TRANSFERENCIA | EFECTIVO | TARJETA_CREDITO | TARJETA_DEBITO | MERCADO_PAGO | DEBITO_AUTOMATICO | OTRO`.
- `InstallmentStatus`: `PENDING | PAID | OVERDUE | SUSPENDED`.
- Recibo del front: el mock genera `IMD-YYYYMMDD-NNNNNN`. Asumo el backend hace lo mismo en `Payment.receiptNumber` autogenerado server-side — el SPA solo lo muestra.
- Campos del Excel aún sin modelar en Student: `interview_status`, `Ausente plat NOV/ENE`, `Pago chq` — quedan como nota amarilla en el form.
