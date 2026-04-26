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

**Fase actual:** SPA — Módulo 8 cerrado (**Contactos**). Próximo: Módulo 9 (Editorial — Autores / Libros / Ventas).

**En qué estoy ahora:**
- **Alumnos** completo (CRUD + form + detail + toggle activo).
- **Cursos** completo (CRUD + CourseForm sin límite máximo de precio + CourseDetail).
- **Inscripciones** completo (CRUD + EnrollmentForm + EnrollmentDetail; alta dispara generación de cronograma de cuotas server-side, el SPA consulta).
- **Cuotas y Pagos** (`/cuotas`) — página única con dos tabs (Cuotas read-only con filtro por estado + Pagos con create). Anchos de columna explícitos y wrapper `.cell-inline` para que `display:flex` no rompa table-cell. Header "Acciones" en ambas tablas.
- **Contactos** (`/contactos`) — CRUD con validación condicional:
  - Listado paginado con buscador (firstName/lastName/companyName/email/role), chips Todos/Empleado/Proveedor + Todos/Activos/Inactivos, sort 3-estados en Nombre/Tipo/Email/Estado.
  - Columna "Nombre" muestra avatar verde + apellido,nombre para EMPLEADO o avatar azul + razón social para PROVEEDOR. Sub-línea con dato secundario (companyName en empleados, persona física en proveedores).
  - Pills coloreadas por tipo, email como link `mailto:`, soft delete vía `PUT /{id}/deactivate`.
  - `ContactForm`: switch radio EMPLEADO/PROVEEDOR cambia los campos visibles. **Validación cruzada client-side** (replica CHECK del backend): EMPLEADO exige `firstName + lastName`, PROVEEDOR exige `companyName`. Label dinámico: "Rol / cargo" para empleados, "Servicio" para proveedores.
  - `ContactDetail`: read-only, secciones Identificación / Contacto / Sistema (con `keycloakUserId` si existe) / Notas. Avatar y badge de tipo distintos según contactType.
  - Mock: 9 seeds — 4 empleados (secretaria, contadora externa, IT, diseñadora editorial inactiva) + 5 proveedores (imprenta, hosting, limpieza, asesoría legal, distribuidora cancelada).
- **Presupuesto / Dashboard** (`/presupuesto`):
  - **Layout:** header → period nav (◄ mes año ►) → 4 KPI cards → flow chart → tabla de entries.
  - **KPIs:** Ingresos / Egresos / Balance (verde si ≥0, rojo si <0) / Proyectado (sub-línea con `+x · −y`). Cada uno usa endpoint `/budget/dashboard/summary?year=&month=`.
  - **Flow chart:** SVG bar chart sin dependencias externas (Recharts evitado para no inflar el bundle). 12 meses lado a lado, barra ingreso (verde) + barra egreso (rojo) por mes. Click en barra → cambia el mes seleccionado. Eje Y con grid + labels compactos (1.2M, 700k). Endpoint `/budget/dashboard/monthly-flow?year=`.
  - **Tabla entries:** filtrada por mes/año (vía `from`/`to` LocalDate del backend) + chips Todos/Ingreso/Egreso + select de categoría. Buscador adicional client-side por concepto/subcategoría/referencia. Sort 3-estados en Fecha/Tipo/Concepto/Categoría/Monto.
  - Columnas: Fecha, Tipo (pill verde/rojo), Concepto (con tags PROY/recurring/cash inline), Categoría, Unidad, Monto (con signo `+/−` y color), Acciones.
  - `BudgetEntryForm`: campos `entryType*`, `category*`, `subcategory`, `businessUnit`, `concept*`, `amount*` (≥0), `entryDate*`, `paymentMethod`, `referenceNumber`, flags `projected/recurring/cash` como checkboxes, `notes`. Sin update — solo create (en líneacon backend que no tiene PUT).
  - `BudgetEntryDetail`: read-only, secciones Clasificación / Pago / Sistema / Notas. Si la entry vino auto-creada (`paymentId`/`bookSaleId`/`enrollmentId` no null), muestra origen.
  - Mock: 30+ seeds cubriendo ene-mayo 2026 con ingresos/egresos/proyectados para que el chart y los KPIs muestren números reales. Endpoints dashboard implementados con agregaciones in-memory.
  - **`BudgetBusinessUnit`:** distinto al `BusinessUnit` de courses — incluye `GENERAL` en lugar de `OTROS`. Tipo separado en `types/budget.ts`.
- **Liquidaciones** (`/liquidaciones`) — state machine `DRAFT → APPROVED → PAID`.
  - Selector de diplomatura arriba (combo con activas), si no hay seleccionada muestra empty state.
  - Listado filtrado por diplomatura + chip por estado (TODAS / DRAFT / APPROVED / PAID), sort default `period desc`.
  - Columnas: Período (mes año), Total cobrado, Socias (total + count), Estado, Acciones.
  - Acciones por fila condicionales: DRAFT → ver/recomputar/aprobar; APPROVED → ver/marcar pagada; PAID → solo ver.
  - `SettlementForm`: solo pide `periodMonth`, `periodYear`, `totalCollected` — el reparto lo calcula el backend automáticamente al crear (queda en DRAFT).
  - `SettlementDetail`: secciones Resumen / Costos fijos / Reparto institucional / Socias (tabla con %, monto, email, "pagada" informativo) / Sistema. Botones de acción al pie según status. Banner verde "Liquidación cerrada" cuando PAID.
  - Mock implementa `SettlementEngine` espejado del backend: `tax = total * tax%`, `neto = total - tax - secretarySalary - advertising`, distribución `admin/univ/imedba/socias` sobre `neto`. `recompute` solo en DRAFT, `approve` DRAFT→APPROVED, `markPaid` APPROVED→PAID con conflict 409.
  - Mock data: 4 settlements seed (3 de Cardiología en estados PAID/APPROVED/DRAFT y 1 de Neonatología APPROVED).
  - **Pagada por socia (informativo, no persiste server-side):** documentado en banner del Detail.
- **Diplomaturas** (`/diplomaturas`) — CRUD completo. **Backend devuelve `List<Diploma>` sin paginar** (no PageResponse) — listo todo en memoria, filtros + sort client-side. Soft delete vía `PUT /{id}/deactivate`.
  - Listado con buscador (nombre+universidad+descripción), chips Todas/Activas/Inactivas, sort 3-estados en Nombre/Universidad/Precio/Socias/Estado.
  - Columnas: Nombre+descripción, Universidad, Precio curso, Reparto (badge `% asignado` rojo si > 100), Socias (count), Estado, Acciones (ver/editar/desactivar).
  - `DiplomaForm`: secciones Identificación / Precios / Costos fijos / Reparto + tabla dinámica de socias (add/remove rows) con header de "Total asignado X% / 100%" en vivo. Botón submit deshabilitado si suma > 100. Campos backend: `name*`, `universityName`, `enrollmentPrice`, `coursePrice`, `taxCommissionPct (0-100)`, `secretarySalary`, `advertisingAmount`, `adminPct/universityPct/imedbaPct (0-100)`, `partnersConfig: [{name, pct, email}]`.
  - `DiplomaDetail`: secciones Identificación/Precios/Costos/Reparto con tabla de socias + Sistema. Total asignado y % libre calculados.
  - Mock: 4 diplomaturas seed (Cardiología Pediátrica UNR, Neonatología Avanzada UCC, Medicina Crítica UBA, Endocrinología UNS inactiva).
- **Descuentos** (`/descuentos`) — CRUD completo de campañas:
  - Listado con buscador (nombre + descripción), chips Todas/Activas/Inactivas, sort 3-estados en Nombre/Tipo/Valor/VigenciaDesde/VigenciaHasta/Estado.
  - Columnas: Nombre (con descripción truncada 2 líneas), Tipo (pill PERCENTAGE/FIXED), Valor (formato según tipo: `15%` o `$50.000`), Vigencia desde/hasta (con "Sin inicio/fin" si null), Estado, Acciones.
  - `DiscountCampaignForm`: validación según tipo — PERCENTAGE máx 100, FIXED libre. `validTo > validFrom` cuando ambos cargados. Ambos opcionales (campañas perpetuas).
  - `DiscountCampaignDetail`: secciones Descuento / Vigencia / Sistema / Descripción.
  - Mock: 7 campañas seed (matrícula 10% transferencia, becas residentes 15%, pronto pago noviembre $30k expirada, plus 2027 early bird 20%, convenio Hospital Italiano $50k, recompra ex-alumnos 12% perpetua, black friday 25% inactiva).
- Capa mock (`src/api/mock/handlers.ts`) sigue activa con `VITE_USE_MOCK=true`.

**Próximo paso:**
- **Módulo 9 — Editorial trio** (`/autores`, `/libros`, `/ventas`). Endpoints `/api/v1/authors`, `/api/v1/books` (con filtro `specialty`/`branch`/`active` y stock con badge rojo si =0), `/api/v1/book-sales` (append-only). Sub-tab "Autores de un libro" con `POST/DELETE /books/{id}/authors`. Royalties: `GET /book-sales/royalties/by-period?year=&month=`. Descuento alumnos: `applyStudentDiscount=true` aplica 30% off si `studentId` presente.
- Pendientes futuros: sub-vista "Inscriptos a la diplomatura X" desde detalle Diplomaturas; soporte para tildar "pagada" por socia en liquidación si el backend lo agrega; integrar `breakdown` en Presupuesto (hoy lo expone el endpoint pero el SPA aún no lo grafica).
- Después en orden: Personal+Horas, Notificaciones.

**Bloqueado por el otro:** nada. Backend Fases 1–8 expuesto en Swagger `localhost:8080/swagger-ui.html`.

**Notas para Santi:**
- Sección `Diplomas` eliminada del Sidebar del SPA. Ruta `/diplomas` ya no existe en el front — si alguien la linkea desde email/notificación, redirigir a `/diplomaturas`. Endpoints backend intactos.
- Los mocks siguen esperando `200` en GET vacío (no 204) para no romper `.json()`.
- `Course.examDate` se parsea manual con `split('-')` (LocalDate sin TZ shifting). Ídem `Installment.dueDate` y `Payment.paymentDate`.
- `BusinessUnit` tipado como `'RESIDENCIAS' | 'PREMATUROS' | 'EDITORIAL' | 'FORMACION_SUPERIOR' | 'OTROS'` — avisame si agregás un valor al enum backend.
- **`BudgetBusinessUnit` ≠ `BusinessUnit`:** el módulo budget usa el enum `'… | GENERAL'` en lugar de `'… | OTROS'`. Mantengo dos tipos separados en `types/budget.ts` y `types/course.ts`. Si en algún momento se unifican backend-side, avisar para colapsar acá también.
- `PaymentMethod` espejado: `TRANSFERENCIA | EFECTIVO | TARJETA_CREDITO | TARJETA_DEBITO | MERCADO_PAGO | DEBITO_AUTOMATICO | OTRO`.
- `InstallmentStatus`: `PENDING | PAID | OVERDUE | SUSPENDED`.
- **Diplomas:** el endpoint `/api/v1/diplomas` devuelve `List<DiplomaResponse>` plano (no paginado) — el SPA filtra y ordena client-side. Si en el futuro se agrega paginación al backend, hay que migrar la página al patrón canónico `PageResponse<T>`.
- **Diploma settlements:** el endpoint `/api/v1/diploma-settlements` también devuelve `List<...>` plano y **requiere `?diplomaId=X`** (sin filtro = 400). Mismo patrón que Diplomas: filtros y sort 100% client-side. Soft delete no aplica (settlements no se borran, solo cambian de estado). Mismo flujo a migrar a `PageResponse` cuando el backend lo soporte.
- **`partnersDistribution.paid`:** el campo `paid` viene del backend pero **no se puede setear vía API hoy** — el SPA lo muestra como informativo en el Detail y deja un banner-nota explicando la limitación. Cuando el backend agregue un endpoint para tildar individualmente, conectar acá.
- Recibo del front: el mock genera `IMD-YYYYMMDD-NNNNNN`. Asumo el backend hace lo mismo en `Payment.receiptNumber` autogenerado server-side — el SPA solo lo muestra.
- Campos del Excel aún sin modelar en Student: `interview_status`, `Ausente plat NOV/ENE`, `Pago chq` — quedan como nota amarilla en el form.
