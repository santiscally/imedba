# Plan de Fases de Desarrollo - IMEDBA

## Metodología

Desarrollo iterativo por módulos. Cada fase produce un entregable funcional y desplegable.

---

## Fase 0: Infraestructura Base (Semana 1-2)

### Objetivo
Tener el entorno de desarrollo, CI/CD y la base del proyecto funcionando.

### Tareas
- [ ] Inicializar repositorio Git (monorepo o multi-repo)
- [ ] Configurar proyecto Spring Boot 3.3+ con Java 21
  - [ ] Dependencias: Spring Web, Spring Data JPA, Spring Security OAuth2 Resource Server, Flyway, PostgreSQL Driver, Lombok, MapStruct
  - [ ] Configurar profiles: dev, staging, prod
- [ ] Configurar proyecto React + TypeScript + Vite
  - [ ] Instalar dependencias: React Router, Axios, Zustand, UI Library (MUI/Ant), Keycloak JS Adapter
- [ ] Docker Compose con todos los servicios
  - [ ] PostgreSQL (app)
  - [ ] PostgreSQL (Keycloak)
  - [ ] Keycloak
  - [ ] Backend (Spring Boot)
  - [ ] Frontend (React build + Nginx)
- [ ] Configurar Keycloak
  - [ ] Crear Realm `imedba`
  - [ ] Crear Client para la SPA React
  - [ ] Crear Client para el Backend (resource server)
  - [ ] Definir roles: ADMIN, VENDEDORA, SECRETARIA_FS, EDITORIAL, CONTABLE, VIEWER
  - [ ] Configurar permisos granulares como client scopes
  - [ ] Crear usuarios de prueba
- [ ] Configurar Flyway con migración inicial (`V001__baseline.sql`)
- [ ] Implementar `BaseEntity` con auditoría y soft delete
- [ ] Implementar `SecurityConfig` con validación JWT
- [ ] Implementar filtro de permisos granulares
- [ ] CORS configurado para desarrollo local
- [ ] Health check endpoints

### Entregable
Login funcional con Keycloak → Dashboard vacío con sidebar de navegación y control de roles.

---

## Fase 1: Gestión Académica - Alumnos y Cursos (Semana 3-5)

### Objetivo
CRUD completo de alumnos, cursos, modalidades e inscripciones. La vendedora puede dar de alta un alumno completo.

### Backend
- [ ] Entidades: `Student`, `Course`, `Modality`, `Enrollment`
- [ ] Migraciones Flyway: `V002__students.sql`, `V003__courses.sql`, `V004__modalities.sql`, `V005__enrollments.sql`
- [ ] Repositorios JPA con especificaciones para filtrado dinámico
- [ ] Servicios con lógica de negocio
- [ ] Controllers REST:
  - [ ] `POST/GET/PUT/DELETE /api/students`
  - [ ] `POST/GET/PUT/DELETE /api/courses`
  - [ ] `GET/POST /api/modalities`
  - [ ] `POST/GET/PUT /api/enrollments`
- [ ] Validaciones: datos obligatorios, email único, DNI válido
- [ ] Filtros de búsqueda: por nombre, curso, estado, fecha
- [ ] Paginación y ordenamiento
- [ ] Restricción: vendedora solo ve sus inscripciones

### Frontend
- [ ] Página de listado de alumnos con tabla, filtros y búsqueda
- [ ] Formulario de alta/edición de alumno
- [ ] Página de detalle del alumno (con sus inscripciones)
- [ ] Página de catálogo de cursos (ABM dinámico)
- [ ] Flujo de inscripción: seleccionar alumno → curso → modalidad → precio
- [ ] Dashboard con contadores: total alumnos, inscripciones activas, por curso

### Entregable
La vendedora puede cargar un alumno, seleccionar un curso con modalidad, y generar una inscripción completa.

---

## Fase 2: Facturación y Cobranza (Semana 5-7)

### Objetivo
Planes de pago, cuotas, registro de pagos, recibos, y lógica de recargos/suspensiones.

### Backend
- [ ] Entidades: `DiscountCampaign`, `Installment`, `Payment` (PaymentPlan absorbido en Enrollment, Receipt absorbido en Payment, PaymentMethod como enum)
- [ ] Migraciones Flyway
- [ ] Motor de cuotas:
  - [ ] Al crear plan de pago → genera automáticamente N cuotas con fechas de vencimiento
  - [ ] Cálculo de matrícula + cuotas
- [ ] Campañas de descuento:
  - [ ] CRUD de campañas
  - [ ] Aplicación automática según fecha y curso
  - [ ] Combinación de descuentos
- [ ] Lógica de recargos:
  - [ ] Scheduler diario: cuotas vencidas después del día 10 → aplicar 5%
  - [ ] Scheduler: cuotas vencidas después del día 20 → marcar para suspensión
- [ ] Generación de recibos PDF
- [ ] Endpoints de conciliación (admin verifica pagos de vendedoras)

### Frontend
- [ ] Formulario de plan de pago integrado al flujo de inscripción
- [ ] Gestión de campañas de descuento
- [ ] Vista de cuotas pendientes (estilo "deudores")
- [ ] Registro de pagos
- [ ] Vista de recibos con opción de reenvío por email
- [ ] Panel de conciliación para admin

### Schedulers
- [ ] `InstallmentDueScheduler`: evalúa cuotas diariamente
- [ ] `SurchargeScheduler`: aplica recargos del 5% a morosos
- [ ] `SuspensionScheduler`: marca alumnos para suspensión

### Entregable
Ciclo completo: inscripción → plan de pago → cuotas generadas → registro de pago → recargo automático si no paga.

---

## Fase 3: Contratos y Notificaciones (Semana 7-9)

### Objetivo
Generación automática de contratos, sistema de notificaciones por email y links WhatsApp.

### Backend
- [ ] Entidades: `Notification` (unifica templates, emails y alertas. Contratos absorbidos en Enrollment)
- [ ] Motor de contratos:
  - [ ] Carga de plantillas por curso (PDF/DOCX)
  - [ ] Generación de contrato con datos del alumno (merge de campos)
  - [ ] Almacenamiento del PDF generado
- [ ] Integración SendGrid:
  - [ ] Servicio de envío de emails
  - [ ] Templates dinámicos con variables
  - [ ] Emails automáticos: bienvenida, contrato, recibo, vencimiento, recargo, suspensión
- [ ] Generador de links WhatsApp:
  - [ ] Formato: `https://wa.me/{phone}?text={encoded_message}`
  - [ ] Templates de mensaje configurables
- [ ] Alertas internas:
  - [ ] CRUD de alertas y recordatorios
  - [ ] Alertas recurrentes (mensuales, anuales)
  - [ ] Panel de alertas en dashboard

### Frontend
- [ ] Gestión de plantillas de contrato
- [ ] Vista de contratos por alumno (enviado, firmado)
- [ ] Configuración de plantillas de email
- [ ] Log de notificaciones enviadas
- [ ] Configuración de alertas internas
- [ ] Widget de alertas en el dashboard

### Entregable
Al inscribir un alumno: se genera contrato → se envía por email → se programan alertas de cuotas → se envían automáticamente.

---

## Fase 4: Editorial (Semana 9-11)

### Objetivo
Gestión completa del área editorial: libros, stock, ventas, autorías.

### Backend
- [ ] Entidades: `Book`, `BookFormat`, `BookSpecialty`, `BookStock`, `BookSale`, `Author`, `BookAuthor`, `RoyaltyCalculation`, `PrintingOrder`, `Branch`
- [ ] ABM de sedes
- [ ] ABM de libros con especialidades y formatos
- [ ] Control de stock:
  - [ ] Stock por sede y formato
  - [ ] Descuento automático al stock al registrar venta
  - [ ] Alertas de stock bajo
- [ ] Ventas de libros:
  - [ ] Venta a alumnos (con descuento del 30%)
  - [ ] Venta a no alumnos (precio lista)
  - [ ] Venta vinculada a inscripción
- [ ] Autorías:
  - [ ] Relación libro-autor con % fijo
  - [ ] Cálculo automático mensual: ventas × % = monto autoría
  - [ ] Generación de reporte de autorías
  - [ ] Alerta de pago de autorías
- [ ] Órdenes de impresión:
  - [ ] Registro de pedidos a imprenta
  - [ ] Ingreso al stock cuando se recibe

### Frontend
- [ ] Catálogo de libros (ABM)
- [ ] Gestión de stock por sede con tabla cruzada (libro × formato × sede)
- [ ] Punto de venta de libros
- [ ] Reporte de autorías mensual
- [ ] Registro de órdenes de impresión

### Entregable
Gestión completa: cargar libros → controlar stock → vender → calcular autorías automáticamente.

---

## Fase 5: Presupuesto y Contabilidad (Semana 11-13)

### Objetivo
Presupuesto general con categorías, sub-presupuestos, dashboard financiero.

### Backend
- [ ] Entidades: `BudgetEntry` (unifica ingresos, egresos, caja, abonos), `Contact` (unifica empleados y proveedores). Categorías como enums.
- [ ] Categorías pre-cargadas:
  - [ ] Gastos Fijos → Personal, Alquiler
  - [ ] Gastos Variables → Impresión, Viáticos, Publicidad
  - [ ] Mantenimiento → Servicios, Insumos oficina
- [ ] Registro de ingresos con linkeo automático a ventas/inscripciones
- [ ] Registro de egresos con categorización
- [ ] ABM de abonos/servicios recurrentes
- [ ] Caja de efectivo
- [ ] ABM de empleados y proveedores
- [ ] Endpoints de dashboard:
  - [ ] Ingresos vs Egresos mensual
  - [ ] Proyectado vs Real
  - [ ] Desglose por unidad de negocio
  - [ ] Desglose por categoría

### Frontend
- [ ] Dashboard financiero con gráficos (recharts/chart.js)
  - [ ] Ingresos vs Egresos (barras mensuales)
  - [ ] Distribución por categoría (torta)
  - [ ] Proyectado vs Real (líneas)
  - [ ] KPIs: total ingresos, total egresos, balance, deuda pendiente
- [ ] Registro de ingresos y egresos
- [ ] Gestión de abonos
- [ ] Caja de efectivo
- [ ] ABM de empleados y proveedores
- [ ] Reportes exportables (PDF/Excel)

### Entregable
Visión centralizada de toda la operación financiera. Reemplaza los múltiples Excel.

---

## Fase 6: Docentes, Tutoras y Formación Superior (Semana 13-15)

### Objetivo
Liquidación de docentes/tutoras y liquidación de Formación Superior.

### Backend - Docentes
- [ ] Entidades: `Staff` (unifica docentes y tutoras con tipo), `HourLog` (incluye flujo de factura), `ActivityType` (lookup con valor hora)
- [ ] ABM de docentes y tutoras
- [ ] Tipos de actividad dinámicos
- [ ] Valores hora configurables por actividad con historial
- [ ] Carga mensual de horas
- [ ] Cálculo automático: horas × valor hora = total
- [ ] Envío automático de email solicitando factura
- [ ] Flujo: carga horas → calcula → envía email → marca factura recibida → paga

### Backend - Formación Superior
- [ ] Entidades: `Diploma` (incluye config distribución como campos y socias como JSONB), `DiplomaEnrollment`, `DiplomaSettlement` (incluye distribución socias como JSONB)
- [ ] Configuración de distribución por diplomatura
- [ ] Motor de liquidación mensual:
  - [ ] Input: total cobrado del mes
  - [ ] Pasos configurables (impuestos, secretaria, publicidad, admin, universidad, socias)
  - [ ] Generación de reporte de liquidación
  - [ ] Distribución entre socias según %
- [ ] ABM de inscripciones a diplomaturas con cuotas

### Frontend
- [ ] Gestión de docentes y tutoras
- [ ] Carga mensual de horas (planilla tipo Excel)
- [ ] Vista de liquidación docente con detalle
- [ ] Gestión de diplomaturas
- [ ] Wizard de liquidación mensual de Formación Superior
- [ ] Reporte de distribución

### Entregable
Liquidaciones automáticas de docentes y formación superior, eliminando las planillas Excel.

---

## Fase 7: Integración Moodle (Semana 15-17)

### Pre-requisitos
- ✅ Contacto establecido con programador de Moodle
- ✅ Versión de Moodle confirmada
- ✅ API REST habilitada con token
- ✅ Funciones necesarias habilitadas

### Backend
- [ ] Log de sincronización (tabla simple o reutilizar `notifications` con tipo MOODLE_SYNC)
- [ ] Servicio de integración:
  - [ ] Crear usuario en Moodle
  - [ ] Inscribir usuario en curso
  - [ ] Suspender acceso
  - [ ] Reactivar acceso
  - [ ] Consultar estado
- [ ] Mapeo de cursos: `courses.moodle_course_id`
- [ ] Mapeo de alumnos: `students.moodle_user_id`
- [ ] Retry automático en caso de fallo
- [ ] Log completo de operaciones

### Frontend
- [ ] Panel de estado de sincronización
- [ ] Mapeo manual curso IMEDBA ↔ curso Moodle
- [ ] Log de operaciones con filtros
- [ ] Botón de resincronización manual

### Entregable
Sincronización automática: inscripción pagada → activo en Moodle, mora → suspendido en Moodle.

---

## Fase 8: Refinamiento, Testing y Deploy (Semana 17-19)

### Tareas
- [ ] Testing end-to-end de todos los flujos
- [ ] Corrección de bugs
- [ ] Optimización de queries (índices, N+1)
- [ ] Configuración de backups automáticos (pg_dump + cron)
- [ ] Hardening de seguridad
  - [ ] HTTPS (certificado SSL en Nginx)
  - [ ] Rate limiting
  - [ ] Sanitización de inputs
  - [ ] CSP headers
- [ ] Deploy en producción (Don Web)
- [ ] Migración de datos históricos (si se decide)
- [ ] Capacitación del equipo IMEDBA
- [ ] Documentación de usuario

### Entregable
Sistema en producción, equipo capacitado, datos migrados.

---

## Fase 9: Refinamiento post-reunión IMEDBA (24-04-2026)

> **Origen**: reunión con Jaquelina, Nico y equipo IMEDBA el 2026-04-24. Ver `07-requerimientos-reunion-20260424.md` para el detalle completo y transcripciones.

### Objetivo
Ajustar el sistema a los requerimientos reales de operación de IMEDBA: dos equipos operativos que no deben verse entre sí, workflow de aprobación de inscripciones, comisiones de diplomatura, agenda de vencimientos de proveedores.

### 9.a — Segmentación por área (Residencias ↔ Formación Superior)

**Contexto**: IMEDBA tiene dos equipos operativos separados. El equipo de Residencias Médicas no debe ver información de Formación Superior, y viceversa. Sólo los 3 socios (rol_admin) ven ambos.

#### Backend
- [ ] Authorities nuevas en Keycloak: `residencias:read`, `residencias:write`, `formacion_superior:read`, `formacion_superior:write`. `ROLE_admin` (socios) tiene las 4.
- [ ] Realm export actualizado (`keycloak/realms/imedba-realm.json`) con nuevos roles.
- [ ] Filtrado server-side en endpoints afectados: students, courses, enrollments, installments, payments, budget, settlements. Basado en authorities del JWT — si no tenés `formacion_superior:read`, no ves entities de FS.
- [ ] Migración `V016__segmentacion.sql`:
  - Eliminar `PREMATUROS` del CHECK de `courses.business_unit` (datos existentes migrados a `FORMACION_SUPERIOR`).
  - Agregar columna `country VARCHAR(2)` a `courses` (default `'AR'`, valores futuros: `UY`, otros).
  - `CREATE EXTENSION IF NOT EXISTS unaccent` para búsquedas sin tilde.
- [ ] Enum `BusinessUnit` Java queda: `RESIDENCIAS`, `EDITORIAL`, `FORMACION_SUPERIOR`, `GENERAL`.
- [ ] Tests de segmentación: un JWT con sólo `residencias:read` no debe listar un curso de Formación Superior (403/filtrado).

#### Frontend (socio)
- [ ] Menú: reemplazar "Académico" por dos entradas "Académico Residencias Médicas" y "Académico Formación Superior". Cada uno lista sus alumnos, cursos e inscripciones.
- [ ] Para socios (con ambas authorities): ver filtro arriba para intercambiar áreas o pestañas.
- [ ] Filtro por `country` en catálogo de cursos (Argentina, Uruguay, futuro "Exterior").
- [ ] Reubicar "Diplomatura" dentro de **Finanzas** (vive allí porque contiene liquidación).
- [ ] Reubicar "Horas" (docentes) dentro de **Administración / Personal**.

### 9.b — Workflow de aprobación de inscripciones

**Contexto**: hoy la vendedora crea inscripción → ACTIVE directo. IMEDBA pide que quede en estado "pendiente" hasta que un socio dé el OK final. Al aprobar: se dispara Moodle + contrato + cobros. Aplica tanto a `Enrollment` (cursos) como a `DiplomaEnrollment` (diplomaturas).

#### Backend
- [ ] Nuevo estado `PENDING_APPROVAL` en `EnrollmentStatus` y `DiplomaEnrollmentStatus`.
- [ ] Authority nueva `enrollments:approve` (equivale a `ROLE_admin`, sólo socios).
- [ ] Endpoints nuevos:
  - `PUT /api/v1/enrollments/{id}/approve`
  - `PUT /api/v1/enrollments/{id}/reject`
  - `PUT /api/v1/diploma-enrollments/{id}/approve`
  - `PUT /api/v1/diploma-enrollments/{id}/reject`
- [ ] Migración `V017__approval_workflow.sql`:
  - Relajar CHECK de `enrollment.status` y `diploma_enrollment.status` para aceptar `PENDING_APPROVAL`.
  - Agregar `approved_at TIMESTAMP NULL`, `approved_by UUID NULL`, `rejection_reason TEXT NULL` en ambas tablas.
- [ ] Mover hooks side-effect de `create` a `approve`:
  - Generación de cuotas (`InstallmentGenerator`) → dispara en approve.
  - Notificaciones WELCOME + CONTRACT → disparan en approve.
  - Moodle sync (`ensureUserAndEnrol`) → dispara en approve.
- [ ] Al crear, estado inicial = `PENDING_APPROVAL`, no se generan cuotas ni notificaciones.
- [ ] Tests de approval flow: create queda pendiente, approve dispara todo el downstream.

#### Frontend (socio)
- [ ] Vista "Inscripciones pendientes de aprobación" (dashboard principal de socios).
- [ ] Botones "Aprobar" / "Rechazar" (con input de `rejection_reason`) en detalle de inscripción.

### 9.c — Comisiones de diplomatura

**Contexto**: cada diplomatura se cohorta en comisiones consecutivas cada 6 meses. Hoy están por la #10; la #11 arranca en agosto. Cada alumno inscripto queda vinculado a una comisión.

#### Backend
- [ ] Nueva entidad `Commission` en `modules/commission/`:
  - `id UUID`
  - `diploma_id UUID` (FK)
  - `number INTEGER` — secuencial, único por diploma_id
  - `start_date LocalDate`, `end_date LocalDate`
  - `status` — OPEN (aceptando inscripciones) / ACTIVE (en curso) / CLOSED
  - `max_capacity INTEGER NULL` (opcional)
  - BaseEntity.
- [ ] Migración `V018__commissions.sql`:
  - Tabla `commissions`.
  - `commission_id UUID NULL` en `diploma_enrollments` (FK).
  - UNIQUE(diploma_id, number).
- [ ] CRUD endpoints `/api/v1/commissions`.
- [ ] Al dar de alta `DiplomaEnrollment`, se elige una `commission_id` de las que están en status OPEN o ACTIVE.
- [ ] Reporte: alumnos por comisión.

#### Frontend (socio)
- [ ] Selector de comisión al inscribir alumno a diplomatura.
- [ ] Filtro por comisión en listado de alumnos de FS.
- [ ] ABM de comisiones dentro de "Diplomaturas".

### 9.d — Abonos / servicios recurrentes

**Contexto**: IMEDBA necesita agendar vencimientos mensuales de proveedores (alquiler, servicios, etc.) con el mismo flujo de factura que ya hicimos para horas docentes (`PENDING_INVOICE → INVOICE_RECEIVED → PAID`). Al marcar PAID, el egreso se auto-linkea al presupuesto.

> **⚠️ Aclaración pendiente**: en el ping-pong del plan, point D dijo "alternativa simple" (extender `budget_entries` con flag) pero la pregunta 4 dijo "entidad propia". Se resuelve con **entidad propia** (`RecurringService`). Si Santi confirma cambio a "alternativa simple", esta sección se refactoriza.

#### Backend
- [ ] Nueva entidad `RecurringService` en `modules/recurringservice/`:
  - `id UUID`
  - `name VARCHAR(200)` — descripción legible ("alquiler oficina", "contador", etc.)
  - `contact_id UUID NULL` (FK a `contacts` — proveedor).
  - `amount NUMERIC(12,2)`
  - `periodicity VARCHAR(20)` — MONTHLY / QUARTERLY / YEARLY
  - `next_due_date LocalDate`
  - `status VARCHAR(30)` — PENDING_INVOICE / INVOICE_RECEIVED / PAID
  - `invoice_received_at TIMESTAMP NULL`, `invoice_file_path VARCHAR(500) NULL`
  - `paid_at TIMESTAMP NULL`
  - `active BOOLEAN`
  - BaseEntity.
- [ ] Migración `V019__recurring_services.sql` — tabla + índice en `next_due_date WHERE active=true`.
- [ ] Endpoints:
  - `GET/POST /api/v1/recurring-services` (filtros `status`, `upcomingDays`, `contactId`).
  - `PUT /api/v1/recurring-services/{id}/invoice-received` (body: `{filePath}`).
  - `PUT /api/v1/recurring-services/{id}/mark-paid` → auto-linkea egreso a `budget_entries` (categoría según tipo).
- [ ] Scheduler mensual (1er día del mes 06:00 Buenos Aires):
  - Para cada `RecurringService` activo y con status `PAID` o con `next_due_date <= today`, resetea a `PENDING_INVOICE` y recalcula `next_due_date` según `periodicity`.
  - Alternativa: mantener historial con una tabla `recurring_service_occurrences` (postergado; mientras, el RecurringService se "reusa" con reset de estado).
- [ ] Authority nueva `recurring_services:read/write`.
- [ ] Tests: estado inicial, transición invoice-received, markPaid auto-linkea budget, scheduler resetea.

#### Frontend (socio)
- [ ] Vista "Abonos" dentro de Finanzas.
- [ ] Agenda mensual de vencimientos con estados visibles y acciones por row.

### 9.e — Búsquedas sin tilde obligatoria

- [ ] Backend: Specs usan `unaccent(LOWER(campo)) LIKE unaccent(LOWER(:q))` para `students.firstName`, `lastName`, `courses.name`, etc.
- [ ] Extensión PostgreSQL `unaccent` habilitada en V016.

### 9.f — Pendientes externos (fuera del scope de esta fase)

- **Moodle**: Santi ya escribió al programador de Moodle (2026-04-24) pidiendo API, API key y documentación. Esperando respuesta. La implementación del cliente (Fase 7) puede avanzar contra la spec estándar mientras tanto; se conecta cuando llega el token.
- **Excel de fijación de precios de cursos** — diferido para evaluación posterior. Jaque pasó dos plantillas de la consultora; no entran ahora.
- **Excel de proyecciones / plan de negocios** (punto de equilibrio, escenarios pesimista/moderado/optimista, costo fijo/variable) — **excluido explícitamente**, IMEDBA no quiere incluirlo por ahora.

### Entregable
Sistema adaptado a la operación real de IMEDBA: dos equipos trabajando en paralelo sin interferencia, inscripciones con OK de socio, comisiones de diplomatura trackeadas y agenda de vencimientos de proveedores con flujo de factura.

---

## Resumen de Fases

| Fase | Módulo | Semanas | Dependencias |
|------|--------|---------|-------------|
| 0 | Infraestructura Base | 1-2 | Ninguna |
| 1 | Gestión Académica | 3-5 | Fase 0 |
| 2 | Facturación y Cobranza | 5-7 | Fase 1 |
| 3 | Contratos y Notificaciones | 7-9 | Fase 2 + SendGrid config |
| 4 | Editorial | 9-11 | Fase 0 + Definir sedes |
| 5 | Presupuesto y Contabilidad | 11-13 | Fases 1-4 (para linkeos) |
| 6 | Docentes y Formación Superior | 13-15 | Fase 5 + Resolver reglas pendientes |
| 7 | Integración Moodle | 15-17 | Fase 2 + Contacto programador Moodle |
| 8 | Refinamiento y Deploy | 17-19 | Todas las anteriores |
| 9 | Refinamiento post-reunión IMEDBA | 19-21 | Fases 1-7 cerradas |

**Tiempo total estimado: ~21 semanas (5 meses)**

> Nota: Las fases 4, 5 y 6 pueden ejecutarse parcialmente en paralelo si hay más de un desarrollador.
