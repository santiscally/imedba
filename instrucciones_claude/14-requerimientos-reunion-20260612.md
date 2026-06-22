# Requerimientos — Reunión IMEDBA 2026-06-12 (demo completa)

> **Origen:** reunión del viernes 12-jun-2026, 11:10, 98 min. Participantes: Gustavo Cataldi,
> Jaquelina Cataldi, Melina Porporato, Nicolás Cataldi, Santiago Scally, Fran Allende.
> Transcripción cruda en `transcripcion-reunion-20260612.pdf` (misma carpeta).
>
> **Tono general de la reunión:** muy positiva. Jaque/Gustavo felicitaron el avance; el sistema
> está "muy avanzado". **La consigna es CERRAR lo que se demostró + email + Moodle, subirlo a un
> servidor de prueba para que el cliente lo use con datos reales en tiempo real, y después a
> producción.** Lo nuevo que salió son refinamientos sobre lo ya hecho, no features grandes.
> El **email** es la pieza que falta para cerrar.

---

## 0. Lo que el cliente validó OK (sin cambios)
Dashboard, alumnos, inscripción (descuento %/$ solo sobre curso, libros sueltos o colección,
grupos de pago, suma total vs separado), cuotas/pagos (recargo automático, agrupar por alumno,
WhatsApp manual, histórico), export a Excel en todas las grillas, presupuesto con egresos +
categorías, editorial (libros/colecciones/ventas/autorías con pool 10%), liquidaciones
(diplomatura = curso espejo), personal/roles. **Todo eso queda como está.**

---

## 1. Cursos (CourseForm) — CAMBIOS CONCRETOS

### 1.1 Modalidad dependiente de la unidad de negocio  *(back + front)*
Hoy la "modalidad" es una lista única para todos. El cliente quiere que **cascada según unidad**:
- **Residencias Médicas:** modalidades actuales (libre / vivo / intensivo / etc.).
- **Formación Superior:** las modalidades son los **tipos de diplomatura/curso** (ej. "Diplomatura
  Prematuros", "Diplomatura Neurodesarrollo", "Curso PAZ", …). **Jaque manda la lista exacta de nombres FS.**
- Editorial NO tiene cursos (solo Residencias y FS los tienen). Confirmado.

### 1.2 Sacar "Fecha de examen"  *(back + front)*
El campo fecha de examen (fecha única) **no sirve a ningún segmento**: FS no rinde examen, y
Residencias no sabe la fecha hasta ~1 mes antes y hay varias. **Decisión: eliminarlo.**
(Meli tiró como idea futura un multi-select de meses tentativos — NO para esta entrega.)

### 1.3 Ciclo lectivo → Comisión para Formación Superior  *(back + front)*
- **Residencias:** "ciclo lectivo" = **año** (como está hoy).
- **Formación Superior:** el campo pasa a ser **número de comisión** (las comisiones son
  secuenciales cada 6 meses; la **10 es la actual**, la **11 arranca agosto 2026**). Las comisiones
  también tienen año. → reaparece el concepto de "Comisión" que estaba diferido en Fase 9.
  Modelar comisión para FS (campo en course / o entidad Commission liviana), y mostrarlo en el form
  solo cuando la unidad sea FS.

---

## 2. Inscripciones (EnrollmentForm)

### 2.1 Tercera opción de distribución de cuotas  *(back + front)*
Hoy hay 2 modos: (a) separado (matrícula = cuota 0, curso en N cuotas, libros aparte) y
(b) suma total (curso + matrícula + libros en N cuotas). **Falta una tercera:**
**(c) curso + matrícula en N cuotas, libros aparte (cuota 0 / cobrados por separado).**
Caso real de Nico: venden cursos donde los libros se cobran aparte y el resto se divide en cuotas.
→ `InstallmentGenerator` necesita el tercer modo + selector en el form.

### 2.2 Selector de promoción/descuento existente  *(front; back ya expone campañas)*
Al inscribir, poder **elegir una promo/campaña de descuento ya cargada** desde un dropdown
(además del descuento manual %/$). El endpoint de discount-campaigns ya existe; falta el selector
en el form (y mantener el manual como override).

---

## 3. Editorial / Ventas

### 3.1 Selector de promoción en la venta de libros  *(front)*
Misma lógica que 2.2 pero en la venta: dropdown de promociones fijas **+** descuento manual %/$.

### 3.2 Venta de varios libros sueltos en una sola operación  *(front + revisar back)*
Hoy se cargan de a uno. Permitir **agregar varios libros distintos** (anatomía + cirugía + …) en
una venta con resumen, sin repetir el alta. Ojo: la **cantidad es por libro** (Santi lo marcó),
así que el form pasa a ser una lista de {libro, cantidad}.

### 3.3 Auto-descuento según alumno / sin alumno  *(front)*
En la venta: si es **sin alumno** → sin descuento automático; si es **alumno** → aplica 35% auto.

### 3.4 Renombrar "Royalties" → "Autorías"  *(front)*
Nico: "autoría, no es un instituto inglés". Cambiar la etiqueta en la UI.

### 3.5 (Opcional / a discutir) Reagrupar editorial  *(front)*
Nico sugirió que tal vez colecciones no necesita ser sección aparte: una sola lista de libros con
stock + acción "vender colección" (elige alumno sí/no → descuento 35% auto). NO firme — evaluar.

---

## 4. Liquidaciones (Settlements)  *(back + front; falta fórmula de Nico)*
- Inputs por liquidación con **toggle plata o porcentaje según el ítem**: publicidad y sueldo
  secretaria = **monto fijo**; impuestos, universidad, directoras = **%**; **administración pasa a
  monto fijo** (es un % de ciertos sueldos, no de lo que entra).
- **Nico va a pasar la fórmula detallada del cálculo**, que es secuencial (descuento → divide →
  descuento…): de lo que queda, **mitad para directoras**; de la otra mitad, **20% IMEDBA(UN3) /
  80% IMEDBA**, con el 15% de cada socia agregado a los costos. **No tocar el motor hasta tener la
  fórmula de Nico** (se cerró en una reunión con Mariano el 13).

---

## 5. Presupuesto
### 5.1 Concepto agrupable/buscable por categoría  *(front; back probablemente ya cubre)*
Dentro de una categoría (ej. Proveedores, Docentes y tutores) poder cargar un **concepto** libre
(ej. "Docente Ana Paliza", "tutora Clara") y luego **buscar/agrupar por concepto**. Decisión:
**concepto = texto editable libre** (NO dropdown forzado, son muchos y varían) + buscador. Verificar
que el buscador ya filtra por concepto/categoría (parece que sí).
### 5.2 Ingresos "otros"  *(sin cambios)*
Plazo fijo, venta de muebles, etc. → categoría **Otros** con detalle. Ya existe. OK.
### 5.3 (Diferido) Agrupar en 5 plazos / balance — **NO en esta entrega** (Fran lo dijo explícito).
### 5.4 (Opcional) Renombrar a "Presupuesto financiero" (es flujo de caja real, no proyección).

## 6. Roles / Personal  *(Keycloak + front)*
- **Nuevo rol `SECRETARIA_RM`** (Secretaría Residencias Médicas) — uno solo, cubre Argentina y
  Uruguay. (Ya existe `SECRETARIA_FS`.) Paula es la secretaria RM.
- **Vendedora:** sumarle acceso a **stock y ventas de libros** (NO a autorías). Hoy solo ve
  alumnos/cursos/inscripciones.
- **Proceso:** al darles acceso de prueba, el cliente va a decir por rol qué falta/sobra → se pule
  iterativamente. Pendiente: lista de qué usuario accede a qué.

## 7. Dashboard  *(front)*
Cuotas vencidas: que el **rojo se intensifique** pasados ~1.5 meses de mora (alerta más fuerte).

## 8. Email — PIEZA QUE FALTA PARA CERRAR  *(back; falta data de Nico)*
- Es lo único grande pendiente para el go-live. El scaffolding provider-agnostic ya está.
- El cliente usa **EnvíaloSimple** + paga algo a Google para enviar muchos mails sin bloqueo
  (lo configura Esteban/David). **Evaluar: integrar con EnvíaloSimple o hacerlo aparte (SMTP propio).**
- Volumen real chico (~10 mails/día de cuotas vencidas) → un tier gratis (~100/día) podría alcanzar; tantear.
- **Mails automáticos requeridos:**
  - **Alta de inscripción** → enviar **recibo** + **contrato (PDF) a firmar** con la info. *(Nico pasa los PDFs.)*
  - **Alerta día 1** de cuota (recordatorio de pago) por mail. *(Nico pasa los textos.)*
- Nico va a pasar: textos predeterminados + los PDFs que se envían automáticamente.

## 9. WhatsApp  *(front; falta data de Nico)*
- Hoy hay un solo mensaje (deudor) hardcodeado. El cliente quiere **varios mensajes predeterminados
  seleccionables** (mensaje deudor, mensaje "al día", etc.), **editables antes de mandar**.
- **Nico pasa todos los textos predeterminados**; se cargan como opciones a elegir.

## 10. Moodle  *(en curso con David)*
Alta/baja (suspender/activar cuenta) — en curso, esperando que David termine de habilitar permisos.
**Seguimiento académico (notas) = módulo FUTURO**, entrega posterior. El cliente (Meli) lo quiere
—hoy su secretaria hace el reporte de habilitación de finales a mano— pero acepta que va después.

## 11. Deploy / proceso
- Tras la reunión: **subir todo a un servidor de prueba en la nube** para que el cliente lo use con
  datos reales en tiempo real → últimos ajustes → producción. El **email** es la pieza que gatilla.
- Jaque va a hablar con el **banco** sobre integrar una plataforma de cobro/suscripción una vez que
  haya algo en línea para mostrar. **Fuera de alcance de esta entrega** (proyecto futuro separado).

---

## Datos que debe el cliente (bloquean varios ítems)
- [ ] **Jaque:** lista de nombres de modalidades de Formación Superior (1.1).
- [ ] **Nico:** lista de medios de pago a agregar (PayPal/prex/walá/billeteras) — o confirmar que
      con transferencia + "otro" alcanza. *(Hoy: el medio que importa es por dónde ENTRA la plata.)*
- [ ] **Nico:** fórmula detallada del cálculo de liquidación (4).
- [ ] **Nico:** textos predeterminados de WhatsApp (9) y de mail (8).
- [ ] **Nico:** PDFs de contrato y recibo para envío automático (8).
- [ ] **Nico:** autores/% de los libros que NO son de residencias (3).
- [ ] **Todos:** qué usuario accede a qué (6).

---

## Prioridades (post 12-jun) — para CERRAR y subir a prueba

**P0 — Cerrar para el servidor de prueba:**
1. **Email** (provider + recibo/contrato en alta + alerta día 1). *(back — gatilla el go-live)*
2. **Moodle** alta/baja (esperando permisos de David). *(back — en curso)*
3. **Cursos:** sacar fecha de examen (1.2) · modalidad cascada por unidad (1.1) · comisión para FS (1.3).
4. **Inscripción:** tercera opción de cuotas (curso+matrícula en cuotas, libros aparte) (2.1).
5. **Roles:** `SECRETARIA_RM` + vendedora con stock/ventas de libros (6).
6. **Deploy** a servidor de prueba en la nube.

**P1 — Refinamientos (durante/después de la prueba):**
7. Liquidaciones: inputs %/$ por ítem + administración como monto + fórmula de Nico (4).
8. Selector de promo en inscripción (2.2) y en venta de libros (3.1).
9. Venta de varios libros sueltos en una operación (3.2) + auto-descuento por alumno/sin-alumno (3.3).
10. WhatsApp: selector de mensajes predeterminados (9).
11. Dashboard: rojo más intenso pasado 1.5 mes (7).
12. Medios de pago (según lista de Nico) · "Royalties"→"Autorías" (3.4) · concepto buscable presupuesto (5.1).

**P2 — Futuro (post go-live):**
13. Módulo de seguimiento académico Moodle (notas) (10).
14. Presupuesto agrupado en 5 plazos / balance (5.3).
15. Integración plataforma de cobro/suscripción con el banco (11).
