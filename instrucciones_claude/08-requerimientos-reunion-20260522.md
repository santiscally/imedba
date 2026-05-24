# Requerimientos detectados — Reunión IMEDBA 2026-05-22

> **Propósito**: registro de los cambios y mejoras al sistema que salieron de la demo del SPA con IMEDBA. Es la **segunda reunión grande** después de la del 24-04-26 (ver `07-requerimientos-reunion-20260424.md`). El alcance acá es **fundamentalmente distinto al de la primera**: ya no son requerimientos de schema/segmentación, son **correcciones de comportamiento sobre lo que vieron en pantalla**.
>
> **Transcripción original**: `instrucciones_claude/reunion-20260522-transcripcion.pdf` (80 min, Tactiq AI).
>
> **Próxima reunión**: **viernes 12 de junio 2026, 11:00**.

---

## Participantes

- **Gustavo Cataldi** — socio mayoritario / parte contable. Habló poco; sus pedidos fueron principalmente sobre facturación con/sin IVA (desestimados en la reunión por Nico).
- **Jaquelina Cataldi** — socia / administración. Mucho peso en decisiones de UX y de organización.
- **Nicolás Cataldi (Nico)** — cobranzas + finanzas. Quien define la mayoría del comportamiento operativo. La fuente más confiable de "esto es así, esto no".
- **Melina Porporato (Meli)** — socia pedagógica de Residencias Médicas. Primera participación en una reunión técnica. Define todo lo del lado académico (seguimiento, especialidades, concursos).
- **Francisco Allende (Fran)** — dev frontend (socio de Santi).
- **Santiago Scally (Santi)** — dev backend.

---

## 1. Resumen ejecutivo

La reunión fue una **demo del SPA** que terminó funcionando como sesión de feedback. Salieron tres tipos de pedidos:

1. **Correcciones de comportamiento sobre módulos ya construidos** (Alumnos, Inscripciones, Cuotas, Diplomaturas, Editorial, Presupuesto, Dashboard) — son la mayoría y la prioridad absoluta. El usuario fue claro: **"lo que presentamos queremos que quede pulido al 100%"**.
2. **Refactor de tres flujos**: separación Diplomatura ↔ Liquidación, Editorial (Autores dentro de Libro), descuentos como dropdown en vez de input libre.
3. **Módulo nuevo**: **Seguimiento académico** (historia de notas/Choice por alumno) — escenario con deadline porque el examen de residencia es en 20 días.

No salieron pedidos de schema masivo como en la reunión anterior. Lo de segmentación Residencias↔FS (Fase 9.a) **quedó implícitamente confirmado** — nadie lo cuestionó porque ya estaba implementado en el SPA que se demo'eó.

---

## 2. Cambios por módulo

### 2.1. Alumnos (Students)

**Campos a agregar al alumno** (citas: Meli 10:51, 13:37; Jaque 11:38-11:54; Meli 14:18, 17:00):

- `iar_pfo_completed BOOLEAN` — "Terminó IAR/PFO" (sí/no). Es la instancia final de Medicina; muchos alumnos arrancan el curso antes de terminarla. Etiqueta exacta sugerida por Meli: **"Terminó IAR/PFO"**.
- `residence_location VARCHAR` — lugar de residencia (separado del domicilio). Sirve para saber si el alumno toma el examen en Argentina o en su país de origen.
- `nationality VARCHAR` — nacionalidad. Importante para diferenciar inscriptos extranjeros (reválida).
- `specialty VARCHAR` o `specialties TEXT[]` — **especialidad/es a la/s que se va a rendir**. Lo llena el alumno (no la vendedora). Puede ser una o varias.
- `target_competition VARCHAR` o `competitions TEXT[]` — **concurso/s al que se presenta**. También lo llena el alumno.

> **Decisión arquitectónica**: Meli inicialmente propuso `specialty/competition` en Inscripción (Fran lo sugirió primero). Jaque lo movió a Alumno porque "la especialidad la pone el alumno, nosotros no la sabemos" (16:50). Va al alumno, no a la inscripción.

**Estado activo/inactivo**: Santi (11:32) propuso reemplazar "activo/inactivo" por "terminó/no terminó". Esto **se descarta** — son cosas distintas. `active` es del sistema (sigue siendo útil para soft delete); `iar_pfo_completed` es campo de negocio independiente.

**Plantilla de alumnos vs matriculados** (Nico 18:38-18:43):
> "que sea una plantilla de alumnos y otra de matriculados, entonces de las matrículas puedes cargar más de una vez al mismo alumno porque anotó el otro año".

**Interpretación (confirmada con el usuario)**: NO renombrar "Inscripciones" → "Matrículas". Mantener la entidad Enrollment. Lo que falta es que **desde el backend se diferencie explícitamente el concepto de matrícula** (hoy `enrollmentFee` está mezclado con `listPrice`). Un alumno puede tener **muchas inscripciones a lo largo del tiempo** (años distintos) pero **no dos simultáneas activas**. Esto ya está en el modelo de datos; lo que hay que hacer es:
- Validar server-side que un alumno no tenga dos `Enrollment` simultáneas con `status IN (ACTIVE, PENDING_APPROVAL)`.
- Exponer claramente desde el backend el "histórico de inscripciones del alumno".

### 2.2. Cursos (Courses)

**Renombrado de modalidad/agrupación** (Nico 14:45-15:10):
- "Plus" deja de existir como nombre. El curso largo se llama simplemente **"Curso de Residencias Médicas"**.
- Modalidades dentro de cursos largos: **Libro** / **Vivo** (con o sin clases sincrónicas).
- **Intensivos**: separados, con modalidades Libro/Vivo.
- **Banco de preguntas**: solo Meli (modalidad pedagógica específica de Residencias).

**Impacto técnico**: ya está cubierto por la Fase 9.a (BusinessUnit + país). El renombrado es solo data — Nico va a pasar la lista final ordenada. **No bloquea desarrollo**.

**Campo "Fecha de examen"** (CourseForm): agregar helper text. Es la fecha del examen final de residencia que el curso prepara. En diplomaturas/talleres queda vacío. **Ya está en backlog de Fran** (review 2026-05-20 punto #3).

### 2.3. Inscripciones (Enrollments)

**Descuento como dropdown — NO input libre** (Nico 20:31-21:32):
- Hoy el `EnrollmentForm` tiene un input numérico libre `discount %`.
- Debe ser un **select de campañas de descuento activas** (las que ya se crean en `/descuentos`).
- Al seleccionar la promo, autocalcula el % y queda registrado **qué promo se aplicó** (no solo el número).
- Mantener la flexibilidad de override manual (el % puede editarse pos-selección).

**Impacto backend**: agregar FK `discount_campaign_id` opcional en `Enrollment`. Si está set, el `discount` se calcula desde la campaña. Si es null, el `discount` libre sigue funcionando como override.

**Auto-aplicación de promos por fecha** (Santi en la reunión 23:08):
- Si una inscripción se crea dentro del rango `[startDate, endDate]` de una campaña activa, la campaña se aplica automáticamente (sin que la vendedora tenga que seleccionarla).
- **Confirmado por el cliente**: "ustedes no se tienen que ni preocupar, lo que sí tienen que estar atentos a las vigencias".

**Cuotas — flujo nuevo** (Nico 25:09 + 28:45 + 29:03; Santi 29:28):

Hoy el flujo es: vendedora pone matrícula + N cuotas + valor de cuota (todo manual). Faltan dos cosas:

1. **Modo "Suma total"** (opcional, checkbox o switch): suma `listPrice + enrollmentFee + libros` y divide en `N` cuotas iguales. Genera N cuotas automáticamente con el mismo monto. Es lo que IMEDBA quiere aplicar este año.
2. **Input "valor de cada cuota"** que muestra debajo el cálculo en vivo: "Total $X → $X/N por cuota". Si queda vacío, toma el cálculo automático.

**Comportamiento default**: mantener el flujo actual (matrícula como cuota 0 + N cuotas separadas). El modo "Suma total" es un toggle adicional. Nico (28:45): *"Esto está bien, pero que también existe la posibilidad de que sume el total"*.

### 2.4. Cuotas y Pagos

**Recargo manual por mora** (Nico 32:22-33:14):
- Hoy el `PaymentForm` registra el pago al valor exacto de la cuota.
- Cuando el alumno paga después del día 10 con el 5% de recargo, **hay que poder modificar el monto cobrado** al registrar el pago.
- **No es auto-calculado** — es manual (la vendedora decide cuánto cobrar como recargo, según el caso).
- El recargo debe quedar **registrado** como tal (no solo como "monto distinto al de cuota"), para poder reportar.

**Impacto técnico**: agregar campo `late_fee_amount NUMERIC` en `Payment` (separado de `amount`). El `amount` queda como pago nominal de la cuota; `late_fee_amount` es el extra. Total cobrado = `amount + late_fee_amount`.

**Diferenciación con/sin IVA — DESCARTADO** (Gustavo 34:31-36:35; Nico 34:44 y reiterado):
- Gustavo planteó querer ver lo facturado/no-facturado en el sistema.
- Nico fue claro: "no tiene nada que ver con toda esta plataforma. Eso es con la facturación. Después hablamos." (34:44)
- La facturación con/sin IVA la maneja Nico en un Excel separado que pasa a Mariana (contadora). **No entra al sistema**.

> **Acción**: ignorar el pedido de Gustavo. Si lo reabre en la reunión del 12-jun, derivar a Nico.

### 2.5. Diplomaturas (REFACTOR MAYOR)

**Separar Diplomatura de Liquidación** (Nico 43:13-44:43):

Hoy el `DiplomaForm` tiene mezclados:
- Datos del producto (nombre, universidad, precios).
- Costos fijos (publicidad, sueldo secretaria, comisión impositiva).
- Reparto institucional (administración %, universidad %, imedba %).
- Socias/directoras con %.

Nico pidió **separarlos**:

**Quedan en Diplomatura** (lo que es "del producto"):
- Nombre, universidad, precio matrícula, precio curso, descripción, activo.
- **Directoras** (renombre de "socias", Jaque 42:42; son solo 2 por ahora — Jaque 43:02). Cada una con: nombre, email, % de reparto.

**Se mueven a Liquidación** (lo que es "del período liquidado"):
- Costos fijos (publicidad, sueldo secretaria, comisión impositiva) → se cargan **por liquidación**, no por diplomatura.
- Reparto institucional (administración %, universidad %, imedba %).

**Razón** (Nico 43:23): *"la publicidad no es un porcentaje de nada, es bueno, este mes gastamos esto en publicidad. Se carga en la liquidación"*.

**Impacto técnico**:
- Mover `taxCommissionPct`, `secretarySalary`, `advertisingAmount`, `adminPct`, `universityPct`, `imedbaPct` de `Diploma` → `DiplomaSettlement`.
- Snapshot del reparto de directoras al crear settlement (igual que está hoy con `partners_config`).
- Renombrar `partnersConfig` → `directorsConfig` o similar (decisión: mantener column name `partners_config` en DB para no romper migraciones, pero exponer como `directors` en API).

### 2.6. Liquidaciones (extender lo que existe)

**Flujo nuevo** (Nico 45:48-47:08):

1. Usuario selecciona diplomatura + período.
2. Sistema calcula `totalCollected` del período (de las cuotas+matrículas+libros liquidados a esa diplomatura).
3. Usuario carga manualmente: publicidad, sueldo secretaria, comisión impositiva, otros costos.
4. Sistema calcula: `neto = totalCollected - costos`.
5. Sobre `neto` aplica % de reparto: administración / universidad / imedba / directoras.
6. Para cada directora: **email automático** con monto a facturar (ya implementado parcialmente — solo falta el envío automático).

**Confirmar**: el flujo del backend (`SettlementEngine`) está casi alineado a este — solo falta:
- Que los costos fijos vengan del input de la liquidación, no de la diplomatura.
- Que `totalCollected` se calcule automático en vez de venir como input manual.
- Notificación email a directoras al `approve`.

### 2.7. Presupuesto / Balance

**Segmentación de categorías** (Nico 51:23-52:53):

**Áreas de ingreso**:
- Residencias Médicas
  - Matrícula por curso (matrícula curso 1, matrícula curso 2, ...)
  - Ingreso por curso (cuotas curso 1, cuotas curso 2, ...)
- Formación Superior
  - Matrícula por diplomatura
  - Ingreso por diplomatura
- Editorial
  - Venta por libro **individual** (no por colección — si se vende una colección, contar uno de cada libro)
- Otros ingresos (categoría con `customLabel` editable: "plazo fijo", "venta de mueble", etc.)

**Áreas de egreso**: las mismas categorías que ya existen en el Excel de presupuesto (Nico va a pasar lista).

**Impacto técnico**:
- Backend ya tiene `category` + `subcategory` + `businessUnit` en `BudgetEntry`. Es suficiente.
- El auto-link de cobros al presupuesto (Fase 5) tiene que **enriquecerse**: cuando se cobra una cuota, además de crear `BudgetEntry` con `category=enrollment`, setear `subcategory = courseName` o `subcategory = matrícula/cuota`. Cuando se vende un libro, `subcategory = bookName` (no `collectionName`).

**Filtros adicionales**:
- Filtro **semestral** además del mensual/anual (Fran lo sugirió en 50:32, Nico ok).
- Descripción mejor en la lista: en vez de UUID del recibo, mostrar "Pago primera cuota — Juan Pérez" (Fran 49:07).

### 2.8. Editorial (REFACTOR MAYOR)

**Cambio 1 — Eliminar solapa "Autores"** (Santi 57:04-57:22; Nico 57:22):

- Hoy hay 3 páginas: `/autores`, `/libros`, `/ventas`.
- **Sacar `/autores`**. Los autores se cargan **dentro del libro** (como las directoras se cargan dentro de la diplomatura).
- En `BookForm`, sección "Autores" con tabla dinámica (add/remove): nombre, % royalty, email opcional.
- Esto está parcialmente implementado — Fran ya hizo el management de autores+royalty% dentro del Detail del libro (ver ESTADO.md 2026-05-22). Falta eliminar la página `/autores` independiente.

**Cambio 2 — Royalties / Autoridades como "ventana económica"** (Nico 54:01-54:57; Meli 55:34-56:25):

- Cuando se vende un libro, generar automáticamente entradas en una **ventana de royalties por período**.
- Reglas:
  - 10% del valor de venta va a los autores (configurable por libro).
  - 5 libros tienen autor único.
  - 2 libros tienen varios autores con desglose por % (configurable).
- **Reporte de royalties**: filtros por período (mes/trimestre/semestre).
- **Frecuencia de pago**: hoy es cada 6 meses; podría cambiar a mensual o trimestral (Meli 56:25).
- **Autores externos**: Mariano Levcovich, chicas de PREMA, etc. **Se cargan como autores normales**, no es un concepto distinto.

**Confirmado con el usuario**: solo registro interno, **sin email automático** a autores externos. El pago se sigue gestionando manual.

**Implementación actual**: `GET /book-sales/royalties/by-period?year=&month=` ya existe (Fran lo hizo el 2026-05-22). Falta:
- Permitir filtro trimestral / semestral en el endpoint.
- En `BookSaleForm`, si se vende una **colección**, generar `N` `BookSale` rows (una por libro de la colección) en vez de una sola — para que el reporte de royalties sea preciso.

### 2.9. Dashboard (REFACTOR COMPLETO)

**Pedido del cliente** (Gustavo + Jaque 1:18:53-1:18:58):
> "Algo que marque un refuerzo positivo".

**Decisión**: refactor completo del dashboard. Reordenar:
- **Arriba (destacados positivos)**: libro más vendido del mes, ingreso del mes vs mes anterior, alumnos nuevos del mes, mejor curso del trimestre, etc.
- **Abajo (operativo)**: cuotas vencidas como tabla secundaria, actividad reciente.

**Para Fran**: definir el nuevo layout. Las métricas positivas pueden derivarse de los endpoints que ya existen — no es necesario crear endpoints nuevos del backend para esto en una primera pasada.

### 2.10. Seguimiento académico (MÓDULO NUEVO)

**Pedido de Meli** (58:44-1:08:50):

Necesidad: ver el rendimiento académico del alumno (notas de exámenes Choice del Moodle) **dentro del detalle del alumno**, sin tener que ir a Moodle.

**Casos de uso**:
- Decidir si un alumno puede pasarse de año (rinde 2027) — Nacho's case (Meli 1:02:04).
- Saber qué materias cursó / cuánto avanzó.

**Decisión arquitectónica (confirmada)**: **Excel upload primero**, no API.
- Meli pide a David (programador de Moodle) un Excel mensual con columnas fijas (alumno, email, materia, nota, fecha).
- IMEDBA sube ese Excel mensualmente al sistema.
- El sistema parsea y guarda en una tabla `academic_record` (`student_id`, `subject`, `score`, `period`, `source`).
- En el detalle del alumno, sección nueva "Rendimiento académico" con tabla de notas.

**Razón para no usar API directa**: David (Moodle) todavía no respondió, y Meli tiene deadline duro (examen residencia en 20 días desde la reunión = ~12 de junio).

**Fase 2 (futuro)**: cuando David responda, automatizar el pull. Pero por ahora **Excel manual mensual** alcanza.

**Pendiente de Meli**: pasar el sample del Excel del Moodle (estructura de columnas) para que Fran codifique el parser.

### 2.11. Plataforma de cobro con Banco Crédicoop (FUTURO — fuera de scope)

Jaque 1:10:42-1:13:34, Nico 1:13:58: están negociando con Banco Crédicoop para tener una **plataforma de cobro propia** (suscripciones, tarjeta crédito/débito) en lugar de Tienda Nube.

- Banco les habló de "API" para conectar.
- Esto **NO entra en el alcance actual** — todos coincidieron (Nico 1:15:28: "sería como otro proyecto").
- Cuando avancen con el banco, será **post-cierre** del proyecto actual.

**Acción**: nada por ahora. Esperar info del banco. Anotar como fase futura.

---

## 3. Prioridades reordenadas

### Premisa principal

> **"Lo que presentamos queremos que quede pulido al 100%"** — Santi en clarificación 2026-05-22.

Esto invierte la prioridad: **antes de avanzar a Fase 9 o módulos nuevos, hay que cerrar las correcciones sobre lo ya demo'eado**.

### P0 — Pulido de lo presentado (cierra antes de la reunión del 12-jun)

**Backend (Santi)**:

1. **Pulir Alumnos**:
   - Agregar campos: `iar_pfo_completed`, `residence_location`, `nationality`, `specialty`, `target_competition` (V016 o lo que toque).
   - Validar server-side que un alumno no tenga dos inscripciones simultáneas activas.
2. **Pulir Inscripciones — descuento como FK**:
   - Agregar FK `discount_campaign_id` opcional en `Enrollment`.
   - Lógica auto-apply: al crear inscripción, si hay campaña activa en la fecha → aplicar.
3. **Pulir Cuotas — recargo manual**:
   - Agregar `late_fee_amount` en `Payment`.
   - Endpoint de pago acepta `lateFeeAmount` opcional.
4. **Pulir Cuotas — modo "Suma total"**:
   - Endpoint de creación de inscripción acepta flag `useTotalDistribution: boolean`. Si true, `InstallmentGenerator` divide `(listPrice + enrollmentFee + bookAmount) / numberOfInstallments` en N cuotas iguales (sin matrícula separada).
5. ✅ **Cerrar pendientes de Fase 9.a en backend** (extender SegmentationFilter a students/enrollments/etc.) — ya estaba en la lista.
6. **DELETE /api/v1/payments/{id}** (Fran lo pide hace rato).
7. **Filtro `courseId` opcional** en `GET /installments` y `GET /payments`.

**Frontend (Fran)** — dejarle nota en ESTADO:

1. **Dashboard refactor completo** — refuerzo positivo arriba, operativo abajo (detalle en 2.9).
2. **EnrollmentForm — Descuento como dropdown** (no input libre). Auto-aplicar promo vigente. Punto 2.3.
3. **EnrollmentForm — toggle "Suma total" para cuotas**. Punto 2.3.
4. **EnrollmentForm + PaymentForm — campo `late_fee_amount`** al registrar pago. Punto 2.4.
5. **Pendientes del review 2026-05-20** que siguen vigentes (precios read-only, helper en examDate, lógica del campo "Libro").
6. **Editorial**:
   - Eliminar página `/autores` del menú principal (ya no es independiente — los autores viven dentro del libro).
   - Cuando se vende colección → generar N book_sale (uno por libro). [coordinar con backend si hace falta endpoint nuevo].

### P1 — Refactores que requieren coordinación

7. **Refactor Diplomaturas ↔ Liquidaciones** (punto 2.5 + 2.6):
   - Backend: mover costos fijos + reparto institucional de `Diploma` → `DiplomaSettlement`.
   - Backend: `totalCollected` auto-calculado al crear settlement.
   - Backend: email automático a directoras al `approve`.
   - Frontend: refactor `DiplomaForm` (simplificar) + `SettlementForm` (más campos).
   - Renombrar "socias" → "directoras" en UI (no en DB).

8. **Presupuesto — segmentación + descripciones** (punto 2.7):
   - Backend: enriquecer `subcategory` en auto-link de cobros.
   - Backend: filtro semestral.
   - Frontend: mostrar concepto legible en lugar de UUID en el listado.

### P2 — Nuevo módulo

9. **Seguimiento académico — fallback Excel** (punto 2.10):
   - Backend: tabla `academic_record`, endpoint `POST /api/v1/academic-records/import` (upload Excel).
   - Frontend: sección "Rendimiento" en `StudentDetail` + página de upload.
   - **Esperar sample de Meli** antes de empezar.

### P3 — Fase 9 backend (pendiente desde reunión anterior)

10. **PENDING_APPROVAL workflow** + autoridad `enrollments:approve`.
11. **Entidad Commission** (cohortes de diplomatura).
12. **RecurringService** (abonos / agenda de vencimientos).
13. **Búsquedas con unaccent**.

### Diferidos / futuros (fuera del alcance actual)

- Integración API Moodle (esperar respuesta de David).
- Plataforma de cobro Banco Crédicoop.
- Diferenciación con/sin IVA en facturación (descartado por Nico).
- Excel de fijación de precios de cursos (de la reunión anterior, sigue diferido).

---

## 4. Plan de reorientación del proyecto

### Antes del 12 de junio (próxima reunión)

**Objetivo**: tener el SPA al 100% pulido sobre los módulos demo'eados + cerrar 2-3 refactores grandes.

| # | Módulo | Backend | Frontend |
|---|--------|---------|----------|
| 1 | Alumnos | V016: 5 campos nuevos + validación inscripción simultánea | StudentForm: 5 campos + validación |
| 2 | Inscripciones | FK discount_campaign_id + auto-apply | EnrollmentForm: dropdown de descuentos |
| 3 | Cuotas | late_fee_amount + modo "suma total" | PaymentForm: recargo manual / EnrollmentForm: toggle |
| 4 | Dashboard | (nada nuevo, usar endpoints existentes) | **Refactor completo** layout positivo |
| 5 | Editorial | (nada nuevo en backend) | Sacar `/autores` del menú |
| 6 | Diplomaturas/Liq | Migrar costos+reparto Diploma→Settlement | Refactor forms |
| 7 | Presupuesto | Enriquecer subcategory + filtro semestral | Mostrar descripción legible |

### En la reunión del 12 de junio

**Mostrar como demo cerrada**: los 7 puntos de la tabla arriba (idealmente todos).
**Pedir al cliente**:
- Sample del Excel de Moodle (Meli).
- Lista final de cursos agrupados (Nico, sigue pendiente desde reunión anterior).
- Lista final de categorías de egresos (Nico).
- Dos directoras de diplomatura con datos (Jaque).
- Porcentajes de reparto Prematuros (Nico).

### Después del 12 de junio

- Arrancar seguimiento académico (módulo nuevo) con el Excel de Meli ya en mano.
- Retomar Fase 9 backend (PENDING_APPROVAL, comisiones, abonos).
- Coordinar con David (Moodle) si responde.

---

## 5. Decisiones de la reunión (resumen para referencia rápida)

| Tema | Decisión |
|------|----------|
| "Plus" como nombre | Eliminado. Solo "Curso de Residencias Médicas". |
| Inscripciones vs Matrículas | Mantener "Inscripciones". Diferenciar matrícula en el backend (campo `enrollmentFee` separado, no en `listPrice`). |
| Especialidad/Concurso | Va en Alumno (lo llena el alumno), no en Inscripción. |
| Descuentos | Dropdown de campañas + auto-apply por vigencia. Input libre solo como override. |
| Recargo por mora | Manual al registrar pago. Campo separado `late_fee_amount`. |
| Cuotas | Mantener flujo actual + agregar modo "suma total" como opción. |
| Facturación con/sin IVA | **Descartado**. Lo gestiona Nico en Excel separado para Mariana (contadora). |
| Diplomaturas | Solo datos del producto + directoras. Costos y reparto van en Liquidación. |
| Socias → Directoras | Renombrar en UI. Mantener column name en DB. |
| Autores | Eliminar página independiente. Viven dentro de Libro. |
| Royalties | Reporte por período (mes/trimestre/semestre). Sin email automático. Sin distinción entre autor IMEDBA y externo. |
| Colección de libros | Al vender colección → generar N book_sale (uno por libro) para royalty preciso. |
| Dashboard | Refactor completo. Refuerzo positivo arriba, operativo abajo. |
| Seguimiento académico | Excel upload mensual primero. API Moodle después. |
| Banco Crédicoop | Fuera de alcance. Proyecto futuro. |

---

## 6. Notas operativas

- **Próxima reunión**: viernes 12 de junio 2026, 11:00.
- **Frecuencia confirmada**: cada 3 semanas (Fran 1:16:54).
- **Tono del cliente**: muy positivo. Jaque 1:19:00: *"Estamos contentos estamos entusiasmados"*. No hubo críticas sustanciales — todo el feedback fue constructivo.
- **Cambio nuevo en el equipo del cliente**: Meli se sumó como interlocutora regular (antes solo Jaque + Nico + Gustavo). **Mantenerla en copia de todo lo de Residencias / seguimiento académico**.
