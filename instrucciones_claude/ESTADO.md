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

**Fase actual:** 8 cerrada. 3 fixes hechos hoy (2026-05-12) antes de arrancar Fase 9.a — ver DIARIO. Plan de Fase 9 armado tras reunión IMEDBA 2026-04-24 (ver `07-requerimientos-reunion-20260424.md`). Fase 7 (Moodle) pausada esperando token del programador de Moodle.

**En qué estoy ahora:**
- **Fixes 2026-05-12** (ver DIARIO):
  - Swagger UI navegable: `SecurityConfig` tiene cadena dedicada con CSP relajado para `/swagger-ui/**` + `/v3/api-docs/**`. En prod sigue off (apiDocsEnabled=false).
  - Admin Keycloak: ahora `admin/admin` en `http://localhost:8081/admin/`. `.env` alineado.
  - Login del SPA: pasó de PKCE-redirect a ROPC (form propio email+password). `frontend/src/lib/auth.ts` exporta `loginWithPassword(username, password)`. `imedba-frontend` ya tenía Direct Access Grants habilitado en el realm export.
- **Fase 9.a parcial — courses segmentado** (2026-05-13, ver DIARIO):
  - V015 aplicada: `unaccent` + columna `country` + datos migrados (PREMATUROS→FORMACION_SUPERIOR, OTROS→GENERAL).
  - Enums Java BusinessUnit unificados a {RESIDENCIAS, EDITORIAL, FORMACION_SUPERIOR, GENERAL}.
  - `SegmentationFilter` (en `common/security/`) calcula BUs visibles según authorities del JWT.
  - `CourseRepository.search` requiere `allowedUnits`; `CourseService` aplica el filtro en list/get/create/update/delete.
  - Realm export ampliado con 7 authorities nuevas + 4 built-in clientScopes (estos últimos *faltaban* del export original — bug histórico que también explica por qué nunca venía `realm_access.roles` en el JWT).
  - **End-to-end auth verificado**: ROPC → JWT con roles → backend valida firma sin iss → @PreAuthorize pasa.
- **Pendientes inmediatos Fase 9.a:**
  1. Extender `SegmentationFilter` a students/enrollments/installments/payments/budget/settlements (Students no tiene BU directa — pertenece transitiva via Course).
  2. Asignar composites VENDEDORA→residencias:* y SECRETARIA_FS→formacion_superior:* en el Keycloak corriendo (solo en JSON ahora). O hacer `docker compose down -v` reset clean.
  3. Crear test usuario con solo `residencias:read` y probar denial.
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
- **🐛 Bug auth descubierto 2026-05-20** (ver DIARIO): entrando directo a ruta protegida (ej. `/dashboard`) sin sesión, `RequireAuth.tsx:21` llama a `login()` (PKCE redirect) en vez de mandar al `/` interno. El form ROPC propio queda eludido. **Fix sugerido:** reemplazar el `useEffect` + `void login(loc.pathname + loc.search)` por `<Navigate to="/" replace state={{ from: loc }}/>`. Es un remanente del flow viejo que quedó después del pivote a ROPC del 2026-05-12.
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

### ⚠️ BLOCKERS para pruebas end-to-end (detectados 2026-04-29)

**Blocker 1 — API URL relativa (ningún request llega al backend)**
`frontend/src/api/client.ts` línea 3: `const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'`
Sin `VITE_API_URL` seteado, las llamadas van a `localhost:5173/api/v1/...`. El nginx del contenedor SPA no tiene proxy para `/api/` y devuelve `index.html` a todo. El backend nunca recibe nada.

**Fix (dos opciones, elegí una):**
- **Opción A** (recomendada para dev con Docker): crear `frontend/.env` (no commitearlo) con `VITE_API_URL=http://localhost:8080/api/v1` y rebuilder el contenedor (`docker compose up -d --build frontend`).
- **Opción B**: agregar bloque proxy en `frontend/nginx.conf`: `location /api/ { proxy_pass http://backend:8080; }` antes del bloque SPA fallback y rebuilder.

**Blocker 2 — Sin header Authorization (backend devuelve 401/403)**
`client.ts` no incluye `Authorization: Bearer <token>`. El backend es un resource server OAuth2 — todos los endpoints requieren JWT. Sin token, Spring Security rechaza la request antes de llegar al handler (por eso tampoco filtra por rol).

**Fix**: integrar la obtención del access token de Keycloak (PKCE flow, client `imedba-frontend`, realm `imedba`, URL `http://localhost:8081`). Agregar a `client.ts`:
```ts
headers: {
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
}
```

**Sobre roles y permisos — qué hay en el backend:**
El backend maneja dos tipos de authorities en el JWT (ver `CLAUDE.md` sección "Contrato front ↔ back"):
- `ROLE_admin`, `ROLE_vendedora`, `ROLE_secretaria`, `ROLE_editorial`, `ROLE_contable`, `ROLE_viewer` → vienen de `realm_access.roles` en el JWT.
- Authorities de permiso granular (ej. `students:read`, `enrollments:write`, `budget:read`, etc.) → vienen de `resource_access.imedba-backend.roles`.

Los endpoints usan `@PreAuthorize("hasAuthority('<permiso>')")`. El listado completo de authorities por módulo está en Swagger (`http://localhost:8080/swagger-ui.html`) y en los archivos de `SecurityConfig`. El filtrado server-side de datos (ej. vendedora solo ve sus inscripciones) ya está implementado en el backend — condicionado a que el request incluya el JWT.

---

## Fran / frontend

**Fase actual:** SPA — Blockers 1 y 2 resueltos (auth contra Keycloak real cableada). Listo para smoke test contra backend. Próximo módulo: 9 (Editorial — Autores / Libros / Ventas).

**En qué estoy ahora:**
- **Auth contra Keycloak real** (resuelve blockers 1 y 2 que documentaste):
  - `frontend/.env` ahora tiene `VITE_API_URL`, `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`. `frontend/.env.example` commiteado como guía. Mientras `VITE_USE_MOCK=true`, todo sigue funcionando con fixtures (modo demo). Para probar contra backend real: `VITE_USE_MOCK=false` + backend levantado.
  - **OIDC PKCE manual** en `src/lib/auth.ts` (sin dep externa, ~250 líneas): `login()` redirige a Keycloak, `handleCallback()` intercambia code por tokens, `getAccessToken()` con refresh automático y coalescing de refreshes concurrentes, `logout()` con `id_token_hint`. Tokens en localStorage (access/refresh/id + expires_at con margen de 30s).
  - `client.ts` ahora inyecta `Authorization: Bearer <token>` en cada request, llamando `await getAccessToken()` (refresca si está vencido). Si `VITE_USE_MOCK=true`, salta todo y usa el mock.
  - `RequireAuth` wrapper sobre todas las rutas privadas. Si no hay sesión, redirige a Keycloak y guarda el `returnPath`. En modo mock se considera siempre autenticado.
  - Nueva ruta `/auth/callback` (procesa el `code` de Keycloak y vuelve al `returnPath`).
  - `Login.tsx`: el botón ahora dice "Ingresar con Keycloak" (o "Entrar (demo)" en mock). Si ya hay sesión activa, salta al dashboard. Form de email/password viejo eliminado (Keycloak hace su propio login).
  - Sidebar tiene footer con nombre + email del usuario logueado y botón "Cerrar sesión" que dispara `logout()`.
  - `currentUser()`, `hasRole(role)`, `hasAuthority(authority)` exportados de `lib/auth.ts` para guards futuros (cuando implementemos las authorities granulares de Fase 9).
- **Alumnos** completo (CRUD + form + detail + toggle activo).
- **Cursos** completo (CRUD + CourseForm sin límite máximo de precio + CourseDetail). **Alumnos del curso**: botón 👥 en cada fila abre modal `CourseStudents` con la lista de inscriptos (nombre/email/fecha/estado); misma lista embebida como sección dentro de `CourseDetail`. Ordeno por apellido client-side (evito `sort=studentLastName`, que Spring rechaza por propiedad anidada).
- **Inscripciones** completo (CRUD + EnrollmentForm + EnrollmentDetail; alta dispara generación de cronograma de cuotas server-side, el SPA consulta).
- **Cuotas y Pagos** (`/cuotas`) — página única con dos tabs (Cuotas con filtro por estado + acciones por fila + Pagos con create). Anchos de columna explícitos y wrapper `.cell-inline`. Tipos alineados al DTO **plano** del backend (solo `enrollmentId`; alumno/curso se resuelven con un mapa de enrollments client-side).
  - **Pago múltiple:** checkbox por cuota pagable; al seleccionar se bloquea a una sola inscripción; barra flotante con total → `PaymentForm` modo batch que crea **un pago por cuota** (loop, un recibo c/u). El back no tiene endpoint batch y está bien así.
  - **Matrícula = cuota 0:** `installmentKind()`/`installmentLabel()` en `types/installment.ts`; `number=0` se muestra como tag "Matrícula" (confirmado contra `InstallmentGenerator`).
  - **Filtros opcionales** alumno/curso en `PaymentForm` para acotar el dropdown de cuotas.
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
- **Auth resuelto** (blockers que documentaste el 29/04). Para que el SPA hable con backend real:
  1. En `frontend/.env`: setear `VITE_USE_MOCK=false`. Las vars de Keycloak ya están en `.env.example` con valores por defecto del compose.
  2. La redirección post-login va a `/auth/callback`. Asegurate de que el client `imedba-frontend` en Keycloak tenga `http://localhost:5173/*` en *Valid Redirect URIs* y `http://localhost:5173` en *Web Origins* (CORS). Si no, pegá un grito.
  3. Backend tiene que aceptar CORS desde `localhost:5173` (en `.env` raíz `APP_CORS_ALLOWED_ORIGINS=http://localhost:5173`).
- **Authorities en JWT:** `currentUser().roles` lee `realm_access.roles` (admin/vendedora/etc.); `currentUser().authorities` lee `resource_access.imedba-backend.roles` (students:read, etc.). Helpers `hasRole()` y `hasAuthority()` listos para guards de UI cuando los necesitemos en Fase 9 (segmentación Residencias↔FS).
- Sección `Diplomas` eliminada del Sidebar del SPA. Ruta `/diplomas` ya no existe en el front — si alguien la linkea desde email/notificación, redirigir a `/diplomaturas`. Endpoints backend intactos.
- Los mocks siguen esperando `200` en GET vacío (no 204) para no romper `.json()`.
- `Course.examDate` se parsea manual con `split('-')` (LocalDate sin TZ shifting). Ídem `Installment.dueDate` y `Payment.paymentDate`.
- `BusinessUnit` tipado como `'RESIDENCIAS' | 'PREMATUROS' | 'EDITORIAL' | 'FORMACION_SUPERIOR' | 'OTROS'` — avisame si agregás un valor al enum backend.
- **`BudgetBusinessUnit` ≠ `BusinessUnit`:** el módulo budget usa el enum `'… | GENERAL'` en lugar de `'… | OTROS'`. Mantengo dos tipos separados en `types/budget.ts` y `types/course.ts`. Si en algún momento se unifican backend-side, avisar para colapsar acá también.
- `PaymentMethod` espejado: `TRANSFERENCIA | EFECTIVO | TARJETA_CREDITO | TARJETA_DEBITO | MERCADO_PAGO | DEBITO_AUTOMATICO | OTRO`.
- `InstallmentStatus`: `PENDING | PAID | OVERDUE` (alineado al enum real del backend; saqué `SUSPENDED`). `Installment`/`Payment` son DTOs **planos** (solo `enrollmentId`, sin objeto enrollment embebido). `Installment.number=0` ⇒ matrícula.
- **Diplomas:** el endpoint `/api/v1/diplomas` devuelve `List<DiplomaResponse>` plano (no paginado) — el SPA filtra y ordena client-side. Si en el futuro se agrega paginación al backend, hay que migrar la página al patrón canónico `PageResponse<T>`.
- **Diploma settlements:** el endpoint `/api/v1/diploma-settlements` también devuelve `List<...>` plano y **requiere `?diplomaId=X`** (sin filtro = 400). Mismo patrón que Diplomas: filtros y sort 100% client-side. Soft delete no aplica (settlements no se borran, solo cambian de estado). Mismo flujo a migrar a `PageResponse` cuando el backend lo soporte.
- **`partnersDistribution.paid`:** el campo `paid` viene del backend pero **no se puede setear vía API hoy** — el SPA lo muestra como informativo en el Detail y deja un banner-nota explicando la limitación. Cuando el backend agregue un endpoint para tildar individualmente, conectar acá.
- Recibo del front: el mock genera `IMD-YYYYMMDD-NNNNNN`. Asumo el backend hace lo mismo en `Payment.receiptNumber` autogenerado server-side — el SPA solo lo muestra.
- Campos del Excel aún sin modelar en Student: `interview_status`, `Ausente plat NOV/ENE`, `Pago chq` — quedan como nota amarilla en el form.
