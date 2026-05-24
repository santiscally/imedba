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

**Fase actual:** Fase 9.a parcial cerrada en backend (segmentación Cursos). **Reunión IMEDBA 2026-05-22 reorientó prioridades** (ver `08-requerimientos-reunion-20260522.md`): el cliente quiere lo presentado pulido al 100% antes de avanzar. Fase 9.b-e (PENDING_APPROVAL, comisiones, abonos, unaccent) baja a P3. Lo que sube a P0: pulir Alumnos/Inscripciones/Cuotas + refactor Diplomaturas↔Liquidaciones + módulo nuevo Seguimiento Académico (Excel Moodle). Próxima reunión: **viernes 12 de junio, 11:00**.

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
- **🔥 NUEVA PRIORIZACIÓN POST-REUNIÓN 2026-05-22 — ver `08-requerimientos-reunion-20260522.md` §3 para detalle completo.**

  **✅ P0 BACKEND CERRADO 2026-05-24** (commits `63214c9` fix Keycloak + `840c372` P0 reunión). Backend levanta en docker, V016+V017 aplicadas, OpenAPI expone los campos nuevos. Detalle:
  1. ✅ V016 alumnos (`iar_pfo_completed`, `residence_location`, `specialty`, `target_competition`; `nationality` ya existía).
  2. ✅ Validación inscripción simultánea (ACTIVE/SUSPENDED — COMPLETED/CANCELLED no cuentan).
  3. ✅ Auto-apply de campaña de descuento por fecha (sin migración — FK `discount_campaign_id` ya existía). `EnrollmentService.resolveDiscount()` con prioridades documentadas.
  4. ✅ V017 `late_fee_amount` en payments + `sumByInstallment` ahora suma amount+lateFee.
  5. ✅ Modo "Suma total" cuotas vía `EnrollmentCreateRequest.useTotalDistribution`.
  6. ✅ `DELETE /api/v1/payments/{id}` (anula pago + revierte cuota a PENDING/OVERDUE según fecha AR).
  7. ✅ Filtro `courseId` opcional en `GET /installments` y `GET /payments`.
  8. ✅ `SegmentationFilter` extendido a Enrollment + Installment + Payment. Students y Budget pendientes (P1).

  **Items originales mantenidos como referencia histórica:**
  1. **Migration V016 — Alumnos**: agregar `iar_pfo_completed BOOLEAN`, `residence_location VARCHAR`, `nationality VARCHAR`, `specialty VARCHAR`, `target_competition VARCHAR`. Actualizar `StudentEntity` + `StudentCreate/UpdateRequest` + DTOs + service.
  2. **Validación inscripción simultánea**: un alumno no puede tener dos `Enrollment` con `status IN (ACTIVE, PENDING_APPROVAL)` a la vez. Excepción `ConflictException` en `EnrollmentService.create`.
  3. **Migration V017 — Inscripciones con campaña**: FK `discount_campaign_id` opcional en `enrollments`. Lógica `EnrollmentService.create`: si NULL pero hay campaña activa cubriendo `enrollmentDate`, asignarla automáticamente. Recalcular `discount` desde la campaña si se setea la FK. Si vendedora pasa `discount` manual, override.
  4. **Migration V018 — Recargo manual**: agregar `late_fee_amount NUMERIC` en `payments`. `PaymentCreateRequest.lateFeeAmount` opcional. Total cobrado = `amount + late_fee_amount`. Exponer en `PaymentResponse`.
  5. **Modo "Suma total" cuotas**: agregar `useTotalDistribution BOOLEAN` (default false) en `EnrollmentCreateRequest`. Si true, `InstallmentGenerator` divide `(listPrice + enrollmentFee + bookAmount) / numberOfInstallments` en N cuotas iguales (sin matrícula como cuota separada). Documentar bien en Swagger.
  6. **DELETE /api/v1/payments/{id}** (Fran pide hace rato): elimina el pago y revierte la cuota a PENDING/OVERDUE según fecha actual vs `dueDate`. Auth: `payments:write`.
  7. **Filtro `courseId` opcional** en `GET /api/v1/installments` y `GET /api/v1/payments`. Resolver vía `installment.enrollment.course.id`.
  8. **Extender `SegmentationFilter`** a students/enrollments/installments/payments/budget/settlements (Students no tiene BU directa — pertenece transitiva via Course). Hoy Cursos sí filtra real; el SPA ya manda `businessUnit` en los otros — solo "se prende" cuando extiendas el filter.

  **P1 — Refactor Diplomaturas ↔ Liquidaciones (coordinar con Fran):**
  9. **Migration V019**: mover `taxCommissionPct`, `secretarySalary`, `advertisingAmount`, `adminPct`, `universityPct`, `imedbaPct` de `diplomas` → `diploma_settlements`. Defaults configurables en `diploma.default_settlement_config` (JSONB opcional) para no tener que cargarlos cada vez.
  10. `DiplomaSettlement.totalCollected` **auto-calculado** al crear (sumar `Payment.amount + lateFeeAmount` de inscripciones de esa diplomatura en el período). El usuario solo carga el período + costos del mes.
  11. **Email automático a directoras** al `approve` del settlement (template con monto a facturar). Usar SendGrid (Fase 3).

  **P1 — Presupuesto:**
  12. Auto-link de cobros enriquecido: setear `BudgetEntry.subcategory` con el nombre del curso/diplomatura/libro según el origen. Hoy queda en NULL.
  13. Endpoint dashboard con agrupación **semestral** además de mensual/anual.

  **P2 — Módulo nuevo: Seguimiento Académico (Excel Moodle)** — esperar sample de Meli antes de empezar:
  14. Tabla nueva `academic_records` (`student_id`, `subject`, `score`, `period`, `source`, `imported_at`).
  15. Endpoint `POST /api/v1/academic-records/import` (multipart con Excel). Parsear con Apache POI. Idempotente: matchear por `student.email + subject + period` y upsertear.
  16. Endpoint `GET /api/v1/students/{id}/academic-records` para alimentar el detalle del alumno.

  **P3 — Fase 9 backend (post 12-jun):**
  17. PENDING_APPROVAL workflow + authority `enrollments:approve`.
  18. Entidad `Commission` (cohortes secuenciales de diplomatura).
  19. Entidad `RecurringService` (abonos / agenda de vencimientos).
  20. `unaccent` en búsquedas server-side (ya hay extension creada en V015, falta usarla en Specs).
- Fase 8 completa (hardening + deploy): `application-prod.yml` con swagger off + actuator restringido + Hikari/Tomcat tuning. `SecurityConfig` con headers defensivos. Nginx con CSP + rate limit (20 req/s `/api`, 5 req/s token endpoint Keycloak). Scripts `backup-db.sh` / `restore-db.sh`. `.github/workflows/backend-ci.yml`. `docker-compose.prod.yml` con deploy limits + healthcheck.
- Fase 9 planificada post-reunión IMEDBA 2026-04-24. Scope: (a) segmentación Residencias↔Formación Superior por authorities + reubicación de Prematuros como diplomatura dentro de FS + `country` en courses; (b) workflow de aprobación de inscripciones (PENDING_APPROVAL → approve por socio dispara Moodle + contrato + cuotas); (c) entidad Commission para cohortes de diplomatura; (d) RecurringService para abonos con flujo de factura; (e) búsquedas sin tilde. Plan detallado en `04-plan-de-fases.md` §Fase 9.
- Fase 7 (Moodle) — ya le escribí al programador de Moodle (2026-04-24) pidiendo API, API key y documentación. Esperando respuesta. El cliente REST puede empezar a codearse ahora contra la spec estándar; se cablea cuando llega el token.
- Fases 0-6 cerradas. Integration tests Testcontainers pendientes de corrida host.

**Próximo paso:**
- **Arrancar P0**: V016 (campos Alumno) → validación inscripción simultánea → V017 (FK discount_campaign) → V018 (late_fee_amount) → modo suma total → DELETE payments → filtro courseId → extender SegmentationFilter. Apuntar a tener todo cerrado para el 12-jun.
- Coordinar P1 con Fran: refactor Diploma↔Settlement requiere cambios de schema + DTOs + forms del SPA en sintonía.
- **Esperar sample de Meli** del Excel de Moodle (P2). Sin eso, no se arranca seguimiento académico.
- Fase 9 backend (P3) **después** del 12-jun.
- Fase 7 (Moodle API): seguir esperando a David. **Reorientado**: el sample Excel de Meli es el camino primario; la API de Moodle pasa a ser fase 2 del seguimiento académico, no fase 1.
- Deploy a Don Web cuando el cliente lo apruebe (todavía no hay fecha, recién se le va a mostrar el sistema pulido el 12-jun).

**Bloqueado por el otro:** nada.

**Notas para Fran:**
- **🔥🔥 REUNIÓN IMEDBA 2026-05-22 — LEER ANTES DE TOCAR NADA.** Detalle completo en `instrucciones_claude/08-requerimientos-reunion-20260522.md`. **Premisa del cliente**: *"lo que presentamos queremos que quede pulido al 100%"*. Eso baja Fase 9 / módulos nuevos y sube las correcciones sobre lo demo'eado. Próxima reunión: **viernes 12 de junio, 11:00** — ahí queremos mostrar todo cerrado.

  **P0 — Pulido para demo del 12-jun (frontend)**, en este orden:
  1. **Dashboard refactor completo** (pedido explícito Gustavo/Jaque, 1:18:53). Reordenar layout: **arriba refuerzo positivo** (libro más vendido del mes, ingreso mes vs mes anterior, alumnos nuevos del mes, mejor curso del trimestre), **abajo operativo** (cuotas vencidas como tabla, actividad reciente). Las métricas positivas podés derivarlas de los endpoints que ya existen (`/dashboard/summary`, `/installments/overdue`, `/dashboard/activity` — todavía solo en mock; coordiná conmigo si necesitás algo nuevo en backend, pero la mayoría sale del mock que ya tenés).
  2. **StudentForm — 5 campos nuevos** (lo agrego yo en V016, vos esperás el `CreateRequest` actualizado en Swagger):
     - `iarPfoCompleted` (boolean, label "Terminó IAR/PFO", default false). Es la instancia final de Medicina — clave para residencias.
     - `residenceLocation` (string, label "Lugar de residencia"). Separado del domicilio. Importante para saber si rinde en Argentina o exterior.
     - `nationality` (string, label "Nacionalidad").
     - `specialty` (string, label "Especialidad a la que se presenta"). **Lo llena el alumno**, no la vendedora — dejá un helper text que lo aclare.
     - `targetCompetition` (string, label "Concurso al que se presenta"). Ídem alumno.
  3. **EnrollmentForm — descuento como dropdown** (no input libre). Reemplazar el input numérico actual por un `<select>` de campañas activas (de `/api/v1/discount-campaigns?active=true`). Al seleccionar, autocalcula el %. Mantener un override manual (botón "Editar manual" que vuelve al input libre). **Auto-apply**: si el backend devuelve un `enrollment` con `discountCampaignId` ya setea (porque hubo una campaña vigente al crear), mostrarlo como pre-seleccionado en el form de edición.
  4. **EnrollmentForm — toggle "Suma total" para cuotas** (nuevo): un switch encima del bloque de cuotas. Si está activo, muestra un disclaimer "Se sumará curso + matrícula + libros y se dividirá en N cuotas iguales". El backend acepta flag `useTotalDistribution: boolean` en el create — pasalo en el payload. Si está apagado, mantener el flujo actual (matrícula como cuota 0 + N cuotas).
  5. **PaymentForm — campo "Recargo (ARS)"** opcional al registrar pago. Mapea a `lateFeeAmount` que voy a agregar en backend. Mostrar total cobrado = `amount + lateFeeAmount`.
  6. **Eliminar página `/autores` del menú** (sigue existiendo el endpoint, pero la nav la sacamos — los autores se gestionan dentro del libro, que ya implementaste el 22/05). Cuando se vende una colección, generar N `book_sale` (uno por libro de la colección) en vez de uno solo — para que el reporte de royalties sea preciso.
  7. **Pendientes vigentes del review 2026-05-20** que NO se cerraron:
     - EnrollmentForm `listPrice` / `enrollmentFee` como labels read-only por default + botón "Editar" (sigue pendiente).
     - Lógica del campo "Libro (ARS)" — revisar contra catálogo `/api/v1/books`.
     - Helper text en `CourseForm.examDate` (ya marcado).
     - Auditar forms vs DTOs del backend (formularios que piden de más).
  8. **Listado de Presupuesto — descripción legible** en vez de UUID. Pedido de la reunión (Fran 49:07). El backend te va a exponer `subcategory` enriquecida cuando lo cierre (ej. "Pago primera cuota — Juan Pérez"). Mientras, podés construirla client-side a partir de los campos disponibles.

  **P1 — Refactor Diplomaturas ↔ Liquidaciones (coordinemos timing):**
  - **DiplomaForm se simplifica**: solo nombre, universidad, precio matrícula, precio curso, descripción, **directoras** (renombre de "socias", solo 2). Sacar campos de costos fijos y reparto institucional.
  - **SettlementForm se enriquece**: agregar inputs para publicidad, sueldo secretaria, comisión impositiva, % adm/univ/imedba. `totalCollected` queda **calculado por el backend** — ya no es input.
  - Renombrar todas las etiquetas UI "Socias" → "Directoras". El column name en DB lo dejo igual para no romper migraciones, pero el campo en TS pasa a `directors`.
  - **Esperar a que cierre la migración V019 antes de tocar los forms**.

  **P2 — Módulo nuevo: Seguimiento Académico (esperar a Meli):**
  - Sección "Rendimiento académico" nueva en `StudentDetail` con tabla de notas (subject, score, period).
  - Página `/academico/import` con file upload (Excel) → `POST /api/v1/academic-records/import`.
  - **No empezar hasta que Meli pase el sample del Excel del Moodle** (tiene deadline duro: examen residencia ~12-jun).

  **DESCARTADOS / FUERA DE ALCANCE** (no implementar aunque alguien lo pida en la próxima reunión sin discutirlo conmigo):
  - Facturación con/sin IVA (Gustavo lo levantó, Nico lo descartó: lo maneja él aparte en Excel).
  - Banco Crédicoop / plataforma de cobros propia (proyecto futuro separado).
  - API directa de Moodle (post-cierre, primero va el Excel).

- **REVIEW VIEJO (2026-05-20) — items 1-4 + 6 siguen vigentes** y absorbidos en la lista P0 de arriba. Item 5 (403 cuotas/pagos/descuentos) ✅ ya cerrado.
  1. **EnrollmentForm — `listPrice` y `enrollmentFee` como labels read-only por default**, con el precio que viene del curso seleccionado. Botón "Editar" o switch que permita override solo si la vendedora lo decide explícitamente. Hoy ambos son inputs editables con placeholder "Si queda vacío, toma el del curso" — confunde porque parecen obligatorios y la UI no muestra el valor de referencia. Mostrar siempre el precio del curso como referencia ahí abajo, aún cuando esté editado.
  2. **EnrollmentForm — Lógica de "Libro (ARS)" no se entiende.** Hoy es un input numérico libre sin contexto. Hay que revisar: ¿es un libro complementario que se agrega a la inscripción y se suma al monto? Si sí, debería ser un select de libros del catálogo (`/api/v1/books`) con su precio cargado automático, o un checkbox "Incluir libro del curso" con descuento 30% si es alumno (regla del CLAUDE.md raíz). Pedir clarificación a Santi sobre la regla exacta antes de cambiar la UI.
  3. **CourseForm — Etiqueta "Fecha de examen" sin contexto.** Agregar tooltip/helper explicando: es la fecha del examen final de residencia que el curso prepara (residencia médica). En cursos sin examen formal (ej. diplomaturas, talleres) queda vacío.
  4. **Dashboard Presupuesto no actualiza con datos reales.** Hay que verificar que las páginas de Presupuesto pegan al backend real (`/api/v1/budget/dashboard/summary`, `/api/v1/budget/dashboard/monthly-flow`) y no a los mocks. Si `VITE_USE_MOCK=false` y aún así no actualiza, hay un bug de cache o de fetch. Endpoints backend existen y devuelven datos reales.
  5. ✅ **403 en Cuotas/Pagos/Descuentos — RESUELTO 2026-05-22.** Ya está aplicado al Keycloak corriendo y verificado con `curl` (ADMIN HTTP 200 en `/installments` y `/discount-campaigns`; VENDEDORA 200 en GETs y 403 correcto en POST de descuentos). **Cerrá sesión y re-logueate** en el SPA y los 403 se van. **Repasá igual** que `client.ts` mande el Bearer en TODAS las requests (no solo algunas) — si hay alguna llamada con `fetch` directo sin pasar por `client.ts`, ahí se rompe.
  6. **Forms piden datos de más — auditar contra DTOs del back.** Para cada form (`StudentForm`, `EnrollmentForm`, `CourseForm`, `BudgetEntryForm`, `DiplomaForm`, etc.) revisar contra `XxxCreateRequest` / `XxxUpdateRequest` del backend en Swagger (`http://localhost:8080/swagger-ui.html`). Sacar campos que el back ignora o no acepta. Marcar opcionales claramente. Particularmente: `EnrollmentForm` tiene 8 campos y el backend probablemente acepta menos.
  7. Recién después de cerrar 1-6: Editorial trio (Autores/Libros/Ventas), y Fase 9 (segmentación Residencias↔FS, guards, menú, country, PENDING_APPROVAL, comisiones).
- **🌐 Prod va a usar puerto 80 (no 5173).** Cuando se haga el deploy a Don Web hay que actualizar en Keycloak el client `imedba-frontend`: *Valid Redirect URIs* `https://<dominio-prod>/*` y *Web Origins* `https://<dominio-prod>`. Backend: `APP_CORS_ALLOWED_ORIGINS=https://<dominio-prod>` en `.env` de prod. Tenelo en cuenta antes del deploy — hoy en dev está correcto con `:5173`.
- **ℹ️ `InstallmentStatus.SUSPENDED` no existe en el backend** (lo verifiqué 2026-05-20). Tu enum TS está bien con `PENDING | PAID | OVERDUE`. La feature de suspensión por mora **sí está implementada**, pero vive en `Enrollment.moodleStatus` (no en `Installment.status`): el `InstallmentScheduler` a las 06:10 marca `enrollment.moodleStatus = "SUSPENDED"` cuando hay cuotas vencidas hace ≥22 días. La cuota sigue como `OVERDUE`.
  - **Dónde mostrar el badge "🔒 Suspendido en Moodle":**
    - **PRIMARIO → vista Inscripciones:** badge por fila, leyendo `enrollment.moodleStatus === "SUSPENDED"`. Es donde el dato vive y donde se actúa (la vendedora/socio decide si reactivar tras un pago).
    - **SECUNDARIO (opcional) → detalle de Alumno:** resumen agregado tipo *"2 de 3 inscripciones suspendidas"*, derivado **client-side** a partir de las inscripciones del alumno.
    - **NO ponerlo como columna en la lista de Alumnos** ni como estado del student. Un alumno puede tener una inscripción suspendida (ej. curso) y otra activa (ej. diplomatura) al mismo tiempo — el flag es per-enrollment, no per-student. Mostrarlo como estado del alumno entero es ambiguo y conceptualmente incorrecto.
- **🐛 Bug auth descubierto 2026-05-20** (ver DIARIO): entrando directo a ruta protegida (ej. `/dashboard`) sin sesión, `RequireAuth.tsx:21` llama a `login()` (PKCE redirect) en vez de mandar al `/` interno. El form ROPC propio queda eludido. **Fix sugerido:** reemplazar el `useEffect` + `void login(loc.pathname + loc.search)` por `<Navigate to="/" replace state={{ from: loc }}/>`. Es un remanente del flow viejo que quedó después del pivote a ROPC del 2026-05-12.
- **ℹ️ Reunión IMEDBA 2026-04-24 — superada por la del 22-05.** Los puntos 1-4 (segmentación + menú + país) están **hechos** (Fase 9.a parcial). Los puntos 5-7 (PENDING_APPROVAL, comisiones, abonos) **bajaron a P3** post-reunión 22-05 — no avanzar sin charlarlo. El doc original (`07-requerimientos-reunion-20260424.md`) queda como referencia histórica; el norte hoy es `08-requerimientos-reunion-20260522.md`. Resumen de los 8 puntos por si necesitás contexto:
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
- **Cursos** completo (CRUD + CourseForm + CourseDetail). **Alumnos del curso**: botón 👥 en cada fila abre modal `CourseStudents`; misma lista embebida en `CourseDetail`. Ordeno por apellido client-side. **Fase 9.a (2026-05-21):** enum `BusinessUnit` alineado a `{RESIDENCIAS, EDITORIAL, FORMACION_SUPERIOR, GENERAL}` (sin PREMATUROS/OTROS); campo **`country`** (select Sudamérica + "Otro", catálogo reutilizable en `types/country.ts`).
- **Segmentación Residencias ↔ Formación Superior (Fase 9.a, 2026-05-21):** selector global de **Unidad** en el `Topbar` (`lib/unidad.tsx`, context persistido en localStorage). Filtra **Cursos** server-side (`businessUnit`, real) y manda `businessUnit` a **Alumnos**/**Inscripciones** (hoy solo filtra en mock — espera que Santi extienda `SegmentationFilter` server-side). Se eligió selector global en vez de dos grupos en el sidebar. **No hecho (sin backend):** `PENDING_APPROVAL`/aprobación, comisiones, abonos.
- **Inscripciones** completo (CRUD + EnrollmentForm + EnrollmentDetail; alta dispara generación de cronograma de cuotas server-side, el SPA consulta).
- **Cuotas y Pagos** (`/cuotas`) — página única con TRES tabs (Cuotas / Pagos / Histórico). Tipos alineados al DTO **plano** del backend (solo `enrollmentId`; alumno/curso se resuelven con un mapa de enrollments client-side).
  - **Pago múltiple:** checkbox por cuota pagable; al seleccionar se bloquea a una sola inscripción; barra flotante con total → `PaymentForm` modo batch que crea **un pago por cuota** (loop, un recibo c/u). El back no tiene endpoint batch y está bien así.
  - **Matrícula = cuota 0:** `installmentKind()`/`installmentLabel()` en `types/installment.ts`; `number=0` se muestra como tag "Matrícula" (confirmado contra `InstallmentGenerator`).
  - **Filtros** (comunes a los 3 tabs): fecha desde/hasta + curso. Pagos manda `from`/`to` (Instant) y Cuotas/Histórico `dueFrom`/`dueTo` (LocalDate). El filtro por **curso** (`courseId`) hoy **solo funciona en mock** — el backend aún no acepta ese param (pedido en DIARIO).
  - **Deshacer pago:** ícono Undo en Pagos → confirm SweetAlert → `paymentsApi.remove(id)` (`DELETE /payments/{id}`). El mock revierte la cuota a impaga. ⚠️ **Requiere endpoint backend** (hoy no existe; pedido a Santi en DIARIO) — contra el back real falla hasta entonces.
  - **Histórico:** tab de cuotas con `status=PAID`, ordenadas por vencimiento desc, con fecha de pago.
  - **Filtros opcionales** alumno/curso también en `PaymentForm` para acotar el dropdown de cuotas.
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
  - **DTO alineado al backend** (fix del 400, 2026-05-21): campos `discountValue` / `startDate` / `endDate` (antes el SPA usaba `value`/`validFrom`/`validTo` → 400). `startDate`+`endDate` son **obligatorios** (back `@NotNull`); ya no se pueden crear campañas perpetuas desde el SPA.
  - `DiscountCampaignForm`: validación según tipo — PERCENTAGE máx 100, FIXED libre. `endDate > startDate`.
  - `DiscountCampaignDetail`: secciones Descuento / Vigencia / Sistema / Descripción.
  - Mock: 7 campañas seed alineadas al nuevo DTO.
- **Editorial completo (2026-05-22) — módulo 9:**
  - **Autores** (`/autores`): CRUD + soft delete. q/active son mock-only (el backend solo pagina/ordena).
  - **Libros** (`/libros`): CRUD + soft delete + badge de stock (rojo si 0). En el detalle se gestionan **autores + royalty%** (`POST/DELETE /books/{id}/authors`) con total de % asignado.
  - **Ventas** (`/ventas`): tab Ventas (append-only, descuenta stock, `applyStudentDiscount`) + tab **Royalties** (`/book-sales/royalties/by-period`, selector mes/año + total). Tipos `author.ts`/`book.ts`/`book-sale.ts`, SCSS compartido `pages/Editorial.scss`.
- **Dashboard con datos + ajustes (2026-05-22):**
  - **Dashboard conectado al mock:** implementé los endpoints que `Dashboard.tsx` ya consumía sin mock — `GET /dashboard/summary` (alumnos/cursos activos, cuotas vencidas, ingresos del mes calendario), `GET /installments/overdue` (cuotas OVERDUE con días de atraso vs hoy, >10 días) y `GET /dashboard/activity` (feed de últimos pagos+inscripciones+ventas). La sección "Actividad reciente" ya no es un EmptyState hardcodeado (usa `.activity-card/.activity-row` que ya estaban en el SCSS). ⚠️ Estos 3 endpoints **NO existen en el backend** → solo mock; con back real el dashboard degrada a "Sin datos"/EmptyState.
  - **Cuota vencida de testing:** D'Amico (`enrollment ...004`) cuota #5 marcada OVERDUE (vence 2026-04-10) para poblar el panel de vencidas.
  - **BookForm:** campo *Formato* ahora es `<select>` Impreso / Digital.
  - **Campos numéricos libres:** removidas las cotas superiores arbitrarias ("entre 0 y 100", "máx 100", año 2020–2100) y `max=` HTML en BookForm, BookDetail (royalty), DiplomaForm (pcts), DiscountCampaignForm, EnrollmentForm (descuento %), SettlementForm (año). Se conservan `required`, pisos `≥0/>0`, mes 1–12 y el guard cruzado de socias ≤100 en DiplomaForm.
- **Infra compartida nueva (2026-05-21):** `lib/text.ts` (`toTitleCase`, usado en `StudentForm` y `AuthorForm`) y `lib/confirm.ts` (wrapper SweetAlert2: `confirmAction`/`alertError`/`toastSuccess`, línea verde petróleo). Usado en Liquidaciones, deshacer pago y todo Editorial; reutilizable para reemplazar `window.confirm` en el resto.
- Capa mock (`src/api/mock/handlers.ts`) sigue activa con `VITE_USE_MOCK=true`.

**Próximo paso:**
- 👉 **Editorial (módulo 9) ya está HECHO (2026-05-22).** Quedan, en orden sugerido:
- **Correcciones del review de Santi (2026-05-20)** — rápidas y marcadas como prioritarias: EnrollmentForm precios read-only, lógica del campo "Libro" en inscripción, helper text en `CourseForm.examDate`, verificar dashboard Presupuesto contra back real, auditar forms que piden datos de más.
- **Módulo 10 — Personal + Horas** (`/personal`, `/horas`) y **Módulo 11 — Notificaciones** (`/notificaciones`). Detalle en `frontend/ROADMAP.md` §10–11.
- **Fase 9 sin backend todavía:** workflow de aprobación (`PENDING_APPROVAL`), comisiones de diplomatura, abonos — esperan endpoints de Santi.
- Pendientes futuros: sub-vista "Inscriptos a la diplomatura X"; tildar "pagada" por socia en liquidación; graficar `breakdown` en Presupuesto.
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
- **Dashboard (2026-05-22):** el SPA consume `GET /dashboard/summary`, `GET /installments/overdue` y `GET /dashboard/activity` (hoy solo mock; el único real es `GET /budget/dashboard/summary`). Si querés un dashboard real, hay que crear esos 3 endpoints — formas en DIARIO 2026-05-22.
- Los mocks siguen esperando `200` en GET vacío (no 204) para no romper `.json()`.
- `Course.examDate` se parsea manual con `split('-')` (LocalDate sin TZ shifting). Ídem `Installment.dueDate` y `Payment.paymentDate`.
- `BusinessUnit` ya alineado a `'RESIDENCIAS' | 'EDITORIAL' | 'FORMACION_SUPERIOR' | 'GENERAL'` (saqué PREMATUROS/OTROS, post-V015). Campo `country` (ISO-2) mapeado en `Course`. **Pendiente tuyo:** el SPA ya manda `businessUnit` en `GET /students` y `GET /enrollments` para el selector global de unidad — hoy lo ignorás; cuando extiendas el `SegmentationFilter` server-side a esos módulos, el filtro "se prende" solo (mismo patrón que `courseId` en installments/payments).
- **`BudgetBusinessUnit` ≠ `BusinessUnit`:** el módulo budget usa el enum `'… | GENERAL'` en lugar de `'… | OTROS'`. Mantengo dos tipos separados en `types/budget.ts` y `types/course.ts`. Si en algún momento se unifican backend-side, avisar para colapsar acá también.
- `PaymentMethod` espejado: `TRANSFERENCIA | EFECTIVO | TARJETA_CREDITO | TARJETA_DEBITO | MERCADO_PAGO | DEBITO_AUTOMATICO | OTRO`.
- `InstallmentStatus`: `PENDING | PAID | OVERDUE` (alineado al enum real del backend; saqué `SUSPENDED`). `Installment`/`Payment` son DTOs **planos** (solo `enrollmentId`, sin objeto enrollment embebido). `Installment.number=0` ⇒ matrícula.
- **Diplomas:** el endpoint `/api/v1/diplomas` devuelve `List<DiplomaResponse>` plano (no paginado) — el SPA filtra y ordena client-side. Si en el futuro se agrega paginación al backend, hay que migrar la página al patrón canónico `PageResponse<T>`.
- **Diploma settlements:** el endpoint `/api/v1/diploma-settlements` también devuelve `List<...>` plano y **requiere `?diplomaId=X`** (sin filtro = 400). Mismo patrón que Diplomas: filtros y sort 100% client-side. Soft delete no aplica (settlements no se borran, solo cambian de estado). Mismo flujo a migrar a `PageResponse` cuando el backend lo soporte.
- **`partnersDistribution.paid`:** el campo `paid` viene del backend pero **no se puede setear vía API hoy** — el SPA lo muestra como informativo en el Detail y deja un banner-nota explicando la limitación. Cuando el backend agregue un endpoint para tildar individualmente, conectar acá.
- Recibo del front: el mock genera `IMD-YYYYMMDD-NNNNNN`. Asumo el backend hace lo mismo en `Payment.receiptNumber` autogenerado server-side — el SPA solo lo muestra.
- Campos del Excel aún sin modelar en Student: `interview_status`, `Ausente plat NOV/ENE`, `Pago chq` — quedan como nota amarilla en el form.
