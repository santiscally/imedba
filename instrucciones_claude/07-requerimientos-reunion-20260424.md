# Requerimientos detectados — Reunión IMEDBA 2026-04-24

> **Propósito**: registro de los requerimientos nuevos y cambios a los existentes que salieron de la reunión con Jaquelina Cataldi, Nico (Imedba Cobranzas), Francisco y Santiago. Sirve para que ambos Claudes (Santi + socio) tengan la misma foto. Complementa `04-plan-de-fases.md` (Fase 9) con el contexto operativo.
>
> **Transcripciones originales**: `C:\Users\Santi\Documents\Santi\personal\freelance\clientes\IMEDBA\reu imedba-24-04-26.pdf` y `reu imedba-24-04-26v2.pdf`.

---

## Participantes

- **Jaquelina Cataldi** — socia de IMEDBA.
- **Imedba Cobranzas (Nico)** — encargado de cobranzas + trackeo financiero.
- **Francisco Allende** — dev frontend (socio de Santi).
- **Santiago Scally** — dev backend.

Socios de IMEDBA mencionados: **3 personas** (Jaque + otras dos — Meli está estrictamente en residencias). Ellos son los únicos con `ROLE_admin`.

---

## 1. Segmentación Residencias Médicas ↔ Formación Superior

### Qué dijeron
IMEDBA tiene **dos equipos operativos separados** con secretarias distintas, procesos administrativos distintos y modelos financieros distintos:

- **Equipo Residencias Médicas**: maneja Argentina + Uruguay (+ eventual "exterior"). Secretaria única para ambos países.
- **Equipo Formación Superior**: diplomaturas + cursos/talleres sueltos. Hoy activa la **Diplomatura de Prematuros** (vinculada con UnTref, tiene liquidación); en desarrollo **Diplomatura de Neurodesarrollo**.

**Cita clave** (Jaquelina, transcript 1 min 30:17): "no existe ninguna conexión a hoy de todos estos años que los de formación superior vean lo que hace residencias, sería un problema que ingrese una cantidad de alumnos a visualizar algo que nunca tuvieron acceso ni unos ni los otros."

### Impacto técnico

- Authorities Keycloak: `residencias:read/write`, `formacion_superior:read/write`. Cada equipo sólo tiene la propia; los 3 socios tienen ambas + `ROLE_admin`.
- Filtrado **server-side** (no alcanza con esconder en el front).
- Aplica a: students, courses, enrollments, installments, payments, budget, settlements.
- Socios pueden ver ambas mediante filtro/pestañas (no necesitan duplicar vistas por módulo).

### Reorganización de business_unit

**Aclaración importante**: en el plan original teníamos `BusinessUnit.PREMATUROS` como enum paralelo a `FORMACION_SUPERIOR`. **La reunión lo corrigió** (Jaquelina, min 22:25: "prematuros está dentro de formación Superior"; Nico transcript 2 min 09:23: "formación superior va a tener diplomatura de prematuros"). Prematuros es una **diplomatura dentro de FS**, no un pilar separado.

Los 3 pilares grandes quedan: **Residencias Médicas**, **Editorial**, **Formación Superior**. Más "Otros" como catch-all.

### Subdivisión geográfica en Residencias

Residencias Médicas se subdivide en Argentina / Uruguay (+ futuro "Exterior"). Jaque (transcript 1 min 23:03): "tenemos intención de hacer residencias en el exterior, después si sale otro país ponemos residencias en el exterior y agrupamos por país".

→ campo `country VARCHAR(2)` en `courses` (default `'AR'`).

---

## 2. Workflow de aprobación de inscripciones

### Qué dijeron
Hoy la vendedora carga todo (alumno + curso + cuotas + descuento + medio de pago). **Nico o los 3 socios** dan el OK final. Recién ahí:

- Se crea usuario en Moodle.
- Se manda contrato por email.
- Se carga al sistema de cobros (se generan cuotas).

**Cita clave** (Nico, transcript 1 min 59:42): "necesitamos que toda la primera parte la pueda hacer la vendedora o la secretaria o la que introduce el alumno. Como lo que es información que lo ponga, pero el OK para darle el alta a la plataforma y que se le mande el contrato y que se le incluyan el sistema de cobros, sea mío para que yo solamente diga, okay".

### Impacto técnico
- Estado nuevo `PENDING_APPROVAL` en `Enrollment` y `DiplomaEnrollment`.
- Authority nueva `enrollments:approve` (solo socios / ROLE_admin).
- Todos los side-effects (Moodle + notifications + generación de cuotas) se mueven del endpoint `create` al endpoint `approve`.

---

## 3. Comisiones de diplomatura

### Qué dijeron
Las diplomaturas se cohortan por **comisión** cada 6 meses. Hoy están en la **#10**, la **#11 arranca en agosto 2026**. Son secuenciales, no se repiten.

**Cita clave** (Nico, transcript 1 min 36:12): "No, no van creciendo. Estamos por la diez. El año que viene va a ser la once en agosto". Y min 35:00: "comisión de diplomatura de prematuros va a haber comisión uno dos tres, que es por cada seis meses no es que son todo el tiempo a la vez. Nosotros necesitamos que se puedan agrupar en la descripción del alumno agregarle qué comisión va a ser".

### Impacto técnico
- Entidad nueva `Commission` (id, diploma_id, número secuencial por diploma, start/end, status OPEN/ACTIVE/CLOSED, capacidad opcional).
- FK `commission_id` en `DiplomaEnrollment`.
- Se asigna al inscribir; sirve para agrupación de alumnos y reportes.

---

## 4. Agenda de vencimientos / abonos recurrentes

### Qué dijeron
Nico quiere una agenda mensual de vencimientos de **proveedores/servicios** (alquiler, contador, servicios, etc.) con el mismo flujo de factura que ya se maneja para docentes: **pendiente de factura → factura recibida → pagado**.

**Cita clave** (Nico, transcript 2 min 04:54): "los abonos me gustaría poder tener una cosa diferenciada en el cual simplemente agregarle una agenda de vencimientos... agenda de vencimientos y pagos en la cual, nosotros podamos llevar mes a mes una listita".

Min 05:44: "le pedimos la factura a los proveedores. Nos la mandaron, le pagamos".

### Impacto técnico
- Entidad nueva `RecurringService` (nombre, proveedor vía contact_id, monto, periodicidad, next_due_date, status de factura, active).
- Scheduler mensual que resetea status e incrementa next_due_date para los activos.
- Al marcar PAID → auto-link como egreso al `budget_entries` del mes correspondiente.

> **Aclaración pendiente**: Santi pidió "alternativa simple" (extender `budget_entries` con flag) en un punto del plan pero en otra respuesta dijo "entidad propia". Se implementa como **entidad propia** por default; si se confirma cambio a simple, refactor.

---

## 5. Menú reorganizado

### Qué dijeron
- "Académico" se parte en **dos entradas**: "Académico Residencias Médicas" y "Académico Formación Superior" (por la segmentación del punto 1).
- **"Diplomatura" va dentro de "Finanzas"** (Jaque, min 27:02: "en los grandes nombres uno dice académico el otro dice finanzas... en diplomas... si es diplomatura estaría en finanzas porque estaría ahí la liquidaciones").
- **"Horas" (docentes) dentro de "Administración/Personal"** (Nico, min 27:37: "liquidaciones debe estar solo la liquidación de diplomatura y después en horas está lo de las horas docentes").

---

## 6. Auto-link de cobros al presupuesto general

### Qué dijeron
Lo que ya implementamos en Fase 5 lo reconfirmaron fuerte y lo extendieron: cuando se cobra una cuota o una venta o se paga un gasto, debe impactar **automáticamente** en el presupuesto general.

Nico también quiere **agregar manualmente** entradas al presupuesto (ej. "vendimos una mesa", caso puntual). Esto ya existe como POST a `budget_entries` manual.

Liquidación de Prematuros (formación superior) impacta en **presupuesto general + área liquidación**.

### Impacto técnico
- Nada nuevo a nivel backend (ya existe). Confirmar con el socio que el front expone el "agregar entrada manual" al presupuesto.

---

## 7. Búsquedas sin tilde obligatoria

### Qué dijeron
Nico (transcript 1 min 26:00) al buscar "Córdoba": "no puse la tilde, lo puedo sacar que requiera tilde porque va a ser un poco molesto".

### Impacto técnico
- Backend: usar `unaccent(LOWER(...))` en Specs para campos de texto. Requiere `CREATE EXTENSION unaccent` en migración.
- Frontend: nada que hacer; el backend devuelve igual sin importar si viene con tilde o no.

---

## 8. Moodle — scope mínimo confirmado

### Qué dijeron
Jaque (min 18:23): "crearlo ponerlo en un curso para usarlo o suspenderlo y eso es suficiente".

El scope que ya teníamos planificado (Fase 7) alcanza. Santi ya escribió al programador de Moodle (2026-04-24) pidiendo API, API key y documentación; **esperando respuesta**.

---

## 9. Cursos — renombrado y reagrupación

### Qué dijeron
Hoy hay ~200 cursos en el Excel por el despelote del 2025 (examen de residencia desdoblado por provincias). La idea es reagrupar:

**Residencias Médicas**:
- Plus (anual) → subdivide en Libre y Vivo según clases sincrónicas sí/no
- Intensivo (más cerca del examen)
- Choice (prácticas de examen) → Libre/Vivo
- Reválida (para extranjeros)
- Uruguay (geográfico)

**Formación Superior**:
- Diplomatura de Prematuros (activa, con liquidación UnTref)
- Diplomatura de Neurodesarrollo (en desarrollo)
- Cursos y talleres sueltos: prescripción, educación física, circo, discapacidad (hoy no activos)

### Qué queda pendiente de IMEDBA
Nico va a pasar **lista final prolija de cursos** con la agrupación correcta. Los nombres son data, no schema — no bloquean el desarrollo.

---

## 10. Excluidos / diferidos

### Diferidos (para evaluación posterior)
- **Excel de fijación de precios de cursos** (la consultora les pasó una plantilla para calcular presupuesto de un nuevo curso a partir de insumos). Santi dijo "pasame el Excel, le damos devolución".

### Excluidos explícitamente
- **Proyecciones / plan de negocios**: punto de equilibrio, escenarios pesimista/moderado/optimista, costo fijo/variable, estado de origen y aplicación de fondos, balance. IMEDBA lo pidió pero se decidió **no incluir** en el alcance actual.

---

## 11. Próximos pasos operativos

- **Santi**: implementar Fase 9 (backend) + esperar respuesta del programador de Moodle para Fase 7.
- **Socio (Francisco)**: reorganizar el menú del SPA (punto 5), preparar las dos vistas segmentadas (Residencias / FS).
- **IMEDBA**: pasar la lista final de cursos agrupada (Nico).
- **Próxima reunión**: **viernes 15 de mayo de 2026**, 11:00. Fallback: 29 de mayo.

### Intermedios posibles
- Entre hoy y el 15 de mayo podría haber una reunión mini con Meli (socia de Residencias) para revisar ese lado.
