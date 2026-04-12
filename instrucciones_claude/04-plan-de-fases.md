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

**Tiempo total estimado: ~19 semanas (4.5 meses)**

> Nota: Las fases 4, 5 y 6 pueden ejecutarse parcialmente en paralelo si hay más de un desarrollador.
