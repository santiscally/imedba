# Requerimientos detectados — Reuniones IMEDBA 2026-05-29 (Moodle) y 2026-06-05 (funcional)

> **Propósito**: registrar los cambios, mejoras y bugs que salieron de dos reuniones posteriores a la del 22-05 (`08-requerimientos-reunion-20260522.md`). Cubre:
> - **29-05** — reunión técnica con **David Silva** (programador de Moodle): cómo integrar (qué expone Moodle, cómo leer/escribir).
> - **05-06** — reunión funcional con **Nico** (la llamada se cortó; quedó dividida en dos partes/transcripciones). Repaso del SPA en vivo + nuevos requerimientos de cobranzas, editorial, presupuesto y un módulo nuevo de "pases".
>
> **Transcripciones originales**:
> - `instrucciones_claude/reunion-20260529-transcripcion.pdf` (17 min, David + Santi).
> - `instrucciones_claude/reunion-20260605-transcripcion-parte1.pdf` (53 min, Nico + Fran + Santi).
> - `instrucciones_claude/reunion-20260605-transcripcion-parte2.pdf` (30 min, Nico + Fran; Santi se retiró).
>
> **Próxima reunión**: **viernes 12 de junio 2026, 11:00** — demo de lo construido. Posible que se sume el área de **coordinación / secretaría**.
> **Tras el 12-jun**: entorno de prueba para IMEDBA (semana del 15). Productivo apuntado a mediados/fin de junio – mediados de julio.

---

## Participantes

- **David Silva** — programador de Moodle (externo a IMEDBA). Define qué se puede integrar y cómo. Va a entregar token de API + documentación de la versión + estructura de la base.
- **Nicolás Cataldi (Nico)** — cobranzas + finanzas. Fuente operativa más confiable. Define casi todo el comportamiento de cobros, editorial y presupuesto.
- **Francisco Allende (Fran)** — dev frontend.
- **Santiago Scally (Santi)** — dev backend (sólo en la 29-05 y parte 1 de la 05-06).

---

## 1. Resumen ejecutivo

Dos reuniones con focos distintos:

**A) Moodle (29-05)** — definición técnica de la integración. La conclusión clave: **suspender al alumno a nivel cuenta de usuario, NO desmatricularlo del curso** (desmatricular borra toda la actividad/notas). Como **un alumno = un solo curso** (reconfirmado), suspender la cuenta alcanza. Moodle expone sus Web Services REST estándar; David provee un token con lectura total + escritura sobre usuarios. La integración arranca con: **listar alumnos, ver activo/inactivo, suspender/activar**. Leer notas y crear usuarios quedan en segunda capa.

**B) Funcional (05-06)** — repaso del SPA con Nico + tanda nueva de requerimientos. Lo más pesado:
1. **Grupos de pago** (vencimiento 1–10 vs 10–20) con recargo y alertas diferenciadas.
2. **Refinamiento del modo cuotas** (agrupar / no agrupar) + **edición manual del monto de cada cuota**.
3. **Editorial — refactor profundo**: concepto de **Colección** (7 libros, anillada/tradicional) + **autorías por libro calculadas por % de páginas**, con desglose por autora.
4. **Egresos en Presupuesto** (hoy sólo hay ingresos) + catálogo de categorías de egreso.
5. **Módulo nuevo "Pases"** (pasar de año) con workflow de 3 alertas y dependencia de Moodle (% de uso).
6. Varios refinamientos (descuento monto/%, libro en inscripción como select, export a Excel) y **un bug de regresión** en Cuotas.

Confirmaciones de lo ya decidido: **inscripción simultánea** (un alumno no está en dos cursos a la vez) y **IVA/facturación fuera de alcance** — ambos reconfirmados por Nico.

---

## 2. Integración Moodle (reunión 29-05)

### 2.1. Decisión central — suspender a nivel usuario, no desmatricular

- Desmatricular a un alumno de un curso en Moodle **borra toda su actividad, logs y notas** (David 01:56). No es opción.
- Moodle tiene dos métodos de matriculación: **manual** (permite suspender individual) y **por cohorte/"corte"** (alta masiva por CSV; NO permite suspender individual porque el curso se vincula a la cohorte, no al alumno). IMEDBA usa mayormente cohortes (David 02:29-09:02).
- **Solución acordada**: como un alumno tiene **un solo curso** (reconfirmado, David 09:39-10:26), se **suspende la cuenta a nivel usuario** (campo `suspended` 0/1 en la tabla de usuarios). Eso le saca acceso a toda la plataforma sin perder datos. Si paga, se cambia el estado y vuelve a entrar.

### 2.2. Qué expone Moodle y qué entrega David

- **API = Web Services REST estándar de Moodle** (David 05:36). David entrega por mail/WhatsApp:
  1. **Token de API** de un usuario con **lectura total + lectura/escritura sobre la tabla de usuarios**.
  2. **Link a la documentación de la versión exacta** de Moodle que usan (para usar los `wsfunction` correctos).
  3. **Estructura completa de la base de datos** (tablas/campos) + reportes configurables, para saber qué traer de dónde.
- Notas/calificaciones: se leen de las tablas de **grades** (David 10:44-11:18). Hay muchas tablas; usar la estructura que pase David.

### 2.3. Alcance de la integración (priorizado por David + Santi)

- **MVP (primera instancia)**: listar alumnos, ver activo/inactivo, **suspender/activar la cuenta** (David 15:06-15:15).
- **Segunda capa**: leer notas por alumno.
- **Diferido — crear usuarios vía API**: David tiene reparo por integridad de tablas (un usuario creado al que le falte un parámetro no se ve; además hay que matricularlo y asignarlo a cohorte). Por ahora **sólo suspender/activar** (Santi 12:41).
- **Diferido — alta masiva por CSV**: la app de IMEDBA podría **generar un CSV** con los campos que Moodle necesita para alta masiva (David 13:31). Futuro.

### 2.4. Requisito que cae sobre NUESTRA app

- **Al suspender a un alumno, IMEDBA debe notificarle** (David 15:55-16:34). Moodle no avisa nada: simplemente no lo deja entrar. La notificación tiene que salir de nuestro sistema.
- Canal pedido por Santi en la reunión: **mail + WhatsApp** (16:16). **⚠️ WhatsApp es un canal nuevo** — hoy sólo está SendGrid (email). Requiere decidir proveedor (Twilio / WhatsApp Business API / Meta Cloud API).

### 2.5. Pendientes Moodle

- Confirmar con IMEDBA **qué campos exactos** hay que sincronizar/traer (Santi 15:26-15:55, quedó abierto).
- Confirmar con David si se puede leer el **% de uso de la plataforma** por alumno (lo necesita el módulo de Pases — ver §3.5).

---

## 3. Cambios por módulo (reunión funcional 05-06)

### 3.1. Cuotas — Grupos de pago (vencimiento + recargo diferenciado) `[back + front]`

IMEDBA maneja **dos grupos de alumnos** con día de vencimiento distinto (Nico parte1 09:07, 11:17-13:35):

- **Grupo 1**: cuota vence **del 1 al 10**; recargo 5% a partir del **día 11**.
- **Grupo 2**: cuota vence **del 10 al 20**; recargo 5% a partir del **día 21**. (Son alumnos a los que "perdonan" el tramo 1–10 y les corren el vencimiento.)

Requisitos:
- Al armar el plan de cuotas, **elegir Grupo 1 / Grupo 2**. Eso define el **día de vencimiento** de las cuotas generadas y el **umbral del recargo**.
- Las **alertas/mails de vencimiento** se disparan según el día del grupo (a unos el 1, a otros el 10).
- **Vista/solapa por grupo** para seguir deudores: "mis deudores del 1 al 10" vs "del 10 al 20" (Nico 13:21).

> Nota de diseño: Nico sugiere ponerlo como un selector grupo 1 / grupo 2 en el panel donde se cargan las cuotas (matrícula / valor total / libros / cuota). No requiere una entidad "grupo" pesada — alcanza un campo `paymentGroup` en la inscripción/plan que parametrice `dueDay` y el umbral de recargo en `InstallmentGenerator` y en `InstallmentScheduler`.

### 3.2. Cuotas — Modo "agrupar / no agrupar" + edición manual de cuotas `[back + front]`

Refina el `useTotalDistribution` que ya existe en backend (Nico parte1 17:13-26:47):

- **Dos modos** al cargar el plan:
  - **Agrupar (suma total)**: suma `curso + matrícula + libros` y divide en `N` cuotas iguales. Default sugerido. Algunos no pagan matrícula (ex-alumnos con 100% descuento).
  - **No agrupar (sólo curso)**: el plan de cuotas es **sólo del curso**; matrícula y libros se cobran aparte (al principio).
- **Desglose visible** del cobro: ítems **matrícula / curso / descuento / libros** (Nico 18:53 — aclaró que lo que él llamaba "recargo" en realidad son los **libros**).
- **Máximo 5 cuotas** (depende del tiempo hasta el examen; tiene que terminar de pagar **un mes antes de rendir**, Nico 18:21).
- **Editar manualmente el monto de cada cuota** (Nico 19:55-22:12): caso "paga la mitad ahora y el resto en dos cuotas". Que se pueda alterar el cronograma generado y que quede una **nota/aclaración en el detalle** de esa cuota. **Esto es nuevo** — hoy las cuotas se generan y no hay endpoint para editar el monto individual.

### 3.3. Inscripciones — descuento monto fijo O porcentaje `[back + front]`

(Nico parte2 02:56-04:19)
- El descuento se calcula **sobre el precio de lista** (confirmado).
- **La matrícula NO recibe descuento** (Nico lo va a aclarar con las directoras). ⚠️ Verificar que `EnrollmentService.resolveDiscount()` aplique el % sólo a `listPrice` y nunca a `enrollmentFee`.
- Que existan **las dos formas de cargar el descuento**: **monto fijo O porcentaje** (las dos opciones disponibles en el form). Hoy el campo de descuento directo de la inscripción es %; falta permitir monto fijo (las campañas ya soportan `FIXED_AMOUNT`, pero esto es para el descuento manual de la inscripción).

> Reconfirmación: el dropdown de campañas + auto-apply por vigencia (de la reunión 22-05) sigue vigente; esto sólo agrega la opción "monto fijo" al override manual.

### 3.4. Editorial — Colecciones + autorías por libro (REFACTOR MAYOR) `[back + front]`

Es el bloque más grande y supera lo que se había planificado en el `08` (que sólo decía "generar N book_sale por colección"). Detalle (Nico parte1 28:39-43:51, parte2 07:11-09:08):

**Modelo de negocio real:**
- **7 libros** de Residencias Médicas. Los alumnos compran la **colección entera (los 7)** con **35% de descuento** (descuento alumno fijo). También se venden **sueltos**.
- **Dos "colecciones"**: **anillada** y **tradicional** — mismos 7 libros, distinto formato y **precio distinto**. Para el sistema = dos colecciones con dos precios.
- **Autorías**: pago **cada 6 meses**, **10% del precio de venta** de cada libro (con descuento incluido si lo tuvo).
  - **5 libros**: 100% de las dos autoras principales → **50% Jaque / 50% Meli** de ese 10%.
  - **2 libros** (Medicina Interna vol. 1 y 2): tienen **autoras adicionales** con % por **cantidad de páginas**. Ej.: 19% una autora + 29% otra → queda 52% → **26% Jaque / 26% Meli**.
  - Los % son **fijos por edición** (4ta edición, no cambian por ~2 años). Nico pasa los números; deben quedar **editables** (no hardcodeados).

**Requisitos concretos:**
1. **Entidad/concepto Colección**: poder crear una colección, asociarle los 7 libros, y darle precio total (uno por variante anillada/tradicional). La data de páginas/% y autoras vive **en el libro**, no en la colección (Santi 36:12-37:52).
2. **Libro — atributo "cantidad de páginas"** (o % directo) + sección **Autoras por libro** con su % (Nico 42:23-42:32).
3. **Venta de colección → desglose por libro en autorías**: al vender una colección, generar el detalle por libro (los 7) para que el cálculo de autoría sea por libro y por autora (Nico 33:00-35:56).
4. **Ventas aisladas**: cargar venta de **libro suelto** (no por curso) con **datos del comprador** (Nico 30:50-31:06).
5. **Venta de curso con libro incluido → genera la venta de colección automáticamente** y la linkea a Editorial **y a Presupuesto** (Nico 31:15, parte2 08:46-09:08, 23:45). Interconexión cobro ↔ editorial ↔ presupuesto.
6. **Buscar/agrupar autorías por autora** para el pago ("se le paga tanto a tal docente", Nico 34:17-34:49).
7. En la vista de Editorial del mes: ver "se vendió una colección a este alumno — valor total / valor descuento alumno" (Nico 31:15-33:00).

> Esto cruza con el item del `08` "al vender colección generar N book_sale". Acá se formaliza: la **colección** es la unidad de venta; el **desglose por libro** es lo que alimenta autorías; el cálculo de % de autora es **por libro** (no por colección).

### 3.5. Módulo nuevo — "Pases" (pasar de año) `[back + front]`

(Nico parte1 45:49-49:53) — **módulo nuevo**, depende de Moodle y de la reunión con secretarías.

**Regla de negocio:**
- Un alumno que **no pudo rendir** y **no usó la plataforma** puede **pasarse de año**.
- Se chequea en Moodle su **% de uso de la plataforma**. Si no usó nada, sólo se le cobra el **% de descuento que tuvo** cuando compró, aplicado al **precio de lista actual**. Ej.: compró con 30% de descuento → el pase cuesta el **30% del precio de lista de hoy**.
- Opción adicional **"¿paga RTP? sí/no"**: si sí, se suma un monto (manual, o calculable como % de otro curso "RTP" que también tienen).
- El pase tiene su **propio contrato**.

**Workflow de 3 alertas internas:**
1. Alumno pide pase → se selecciona el alumno y "pedido de pase" → **alerta** (a vendedora / secretaria / Nico).
2. **Secretaria** chequea en Moodle el % de uso → confirma si paga RTP o no → **alerta a Nico** ("ya está chequeado, fijate cuánto tiene que pagar").
3. **Nico** carga el monto y se encarga de hablar con la persona.

**Dependencias**: que la secretaria pueda ver el % de uso de Moodle (a confirmar con David). Probable **reunión con secretarías** para pulir este flujo.

### 3.6. Presupuesto — Egresos + catálogo de categorías `[back + front]`

(Nico parte2 24:31-27:18)
- Hoy Presupuesto **sólo tiene ingresos**; no hay egresos cargados ni flujo claro para cargarlos. Falta el **alta de egresos**.
- **Categorías de egreso** que define Nico (catálogo a cargar; las pasa por escrito):
  1. Sueldos
  2. Proveedores (monotributistas)
  3. Docentes (docentes y tutores/tutoras)
  4. Publicidad
  5. Oficina y servicios (alquiler + servicios + gastos de oficina, papel, etc.)
  6. Viajes (viáticos a provincias)
  7. Editorial — gastos específicos (impresión de libros, autoría)
  8. Abonos (ej. "Clau")
  9. Impuestos
  10. Gastos bancarios / de plataforma
  11. Gastos varios (viáticos, almacén)

> Backend ya soporta `entryType=EGRESO` + `category` + `subcategory`. Falta el catálogo de categorías de egreso y el form de carga en el SPA.

### 3.7. Cursos — catálogo + agrupar por ciclo lectivo `[data + front]`

(Nico parte1 05:52-10:50)
- Nico va a pasar la **lista de nombres exactos** de cursos. Estructura:
  - **Área Residencias**: el curso largo/básico es "libre" (no lleva año). Más: **RM Uruguay** y **Reválida** (examen de extranjeros para revalidar matrícula) — ambos son cursos del área Residencias.
  - **Área Diplomatura**: por ahora una: **"Paradigmas de nacimiento y cuidado al niño prematuro"** (prematuros, nombre formal universitario).
- **Agrupar cursos por ciclo lectivo / año** ("sería un golazo", Nico 09:42). Cursos **anuales**.

> Mayormente data (esperar lista de Nico). La feature nueva posible es **agrupar/filtrar por ciclo lectivo (año)** en el listado de Cursos.

### 3.8. Inscripciones — Libro como select de colección `[back + front]`

(Nico parte2 07:11-09:08) — refina el item del review 22-05 sobre el campo "Libro (ARS)":
- Hoy el libro en la inscripción es un **monto libre** ("Libro ARS") cobrado aparte.
- Cambiar a **seleccionar qué libro/colección** del catálogo. Los alumnos compran **la colección de 7 con 35% de descuento, siempre**.
- Al cobrar, **agrupar junto** (cobro unificado) y **linkear automáticamente** a Editorial (registra venta de colección a ese alumno) y a Presupuesto.

### 3.9. Export a Excel `[back o front]`

(Fran/Nico parte1 16:45-17:08)
- Poder **exportar las tablas a Excel** (backup + informe/balance anual de ingresos). Aplica al menos a Cuotas/Pagos y Presupuesto.

### 3.10. Bug — filtro por alumno en Cuotas/Pagos `[front]`

(parte2 05:38-06:43) **Bug de regresión** detectado en vivo:
- Antes, al buscar por alumno en Cuotas, traía sólo ese alumno. Ahora **no toma el filtro** ("puede ser un cambio que hice yo antes... se rompe", Fran 06:43). Hay que arreglarlo.
- Además: hoy los pendientes se **agrupan por cuota**; Nico necesita poder **agrupar por alumno** (ver todas las cuotas de un alumno con sus vencimientos). Necesita **ambas vistas** (por cuota y por alumno).

### 3.11. Liquidaciones — Nico debe pasar el cálculo `[pendiente cliente]`

(Nico parte2 24:31) — Nico tiene que pasar **cómo se calcula la liquidación**. Pendiente de su lado; necesario para validar/ajustar el `SettlementEngine`.

### 3.12. Alta de alumnos vía Google Form `[diferido]`

(Nico parte2 00:58-01:32) — hoy IMEDBA manda un **Google Form** a los alumnos al anotarse y carga los datos a mano desde la lista del form. Idea futura: integrar el form para que el alta se cargue sola. **Diferido.**

---

## 4. Prioridades reordenadas (objetivo: demo 12-jun + entorno de prueba semana del 15)

> **Premisa vigente** (de la reunión 22-05): pulir al 100% lo presentado. Estas reuniones agregan **refinamientos sobre lo ya construido** + **un módulo nuevo (Pases)** + **la integración Moodle**, que caen naturalmente después del pulido.

### P0 — Cerrar para la demo del 12-jun (pulido + fixes claros)

| # | Item | Lado | §  |
|---|------|------|----|
| 1 | **BUG**: filtro por alumno en Cuotas/Pagos roto + agrupar pendientes por alumno | front | 3.10 |
| 2 | **Grupos de pago** (vencimiento 1–10 / 10–20, recargo y alertas diferenciadas, vista de deudores por grupo) | back + front | 3.1 |
| 3 | **Modo agrupar/no agrupar** refinado + **edición manual del monto de cada cuota** (con nota) | back + front | 3.2 |
| 4 | **Descuento monto fijo O %** en inscripción + verificar que matrícula no recibe descuento | back + front | 3.3 |
| 5 | **Libro en inscripción = select de colección** (35% auto) + link a venta/presupuesto | back + front | 3.8 |
| 6 | **Egresos en Presupuesto** (form de egreso + catálogo de categorías) | back + front | 3.6 |
| 7 | **Export a Excel** (Cuotas/Pagos, Presupuesto) | front (o back) | 3.9 |

### P1 — Refactor grande / coordinación

| # | Item | Lado | §  |
|---|------|------|----|
| 8 | **Editorial — Colecciones + autorías por página** (concepto Colección, páginas/% por libro, desglose por libro, venta automática desde inscripción, búsqueda por autora) | back + front | 3.4 |
| 9 | **Cursos — agrupar por ciclo lectivo/año** (+ cargar lista final de Nico) | front + data | 3.7 |

### P2 — Módulos / integraciones nuevas (post 12-jun)

| # | Item | Lado | §  |
|---|------|------|----|
| 10 | **Integración Moodle**: listar alumnos + suspender/activar a nivel usuario + leer notas (2ª capa). Cliente REST contra Web Services estándar | back | 2 |
| 11 | **Notificación al suspender** (mail + **WhatsApp** — canal nuevo, decidir proveedor) | back | 2.4 |
| 12 | **Módulo Pases** (pasar de año): cálculo % descuento sobre precio de lista actual + RTP + contrato + workflow de 3 alertas | back + front | 3.5 |

### Pendientes del cliente — pedir/confirmar el 12-jun

- **Nico**: lista final de cursos agrupados por ciclo lectivo; % exactos de autorías por libro/autora; **cómo se calcula la liquidación**; categorías de egreso por escrito.
- **David (Moodle)**: token de API + doc de la versión + estructura de la base de datos. Confirmar si se puede leer **% de uso** por alumno.
- **Secretarías**: reunión para pulir el flujo de Pases / % de uso (posible que se sumen el 12-jun).
- **Meli**: sample del Excel de seguimiento académico (sigue pendiente desde el `08`).

### Diferidos / fuera de alcance

- Crear usuarios en Moodle vía API (David tiene reparo por integridad).
- Alta masiva a Moodle por CSV generado por la app.
- Integración con Google Form para alta de alumnos.
- IVA / facturación (reconfirmado descartado — Nico lo maneja en Excel).
- Banco Crédicoop (de la reunión anterior).

---

## 5. Decisiones (resumen para referencia rápida)

| Tema | Decisión |
|------|----------|
| Suspensión en Moodle | A nivel **cuenta de usuario** (`suspended` 0/1), NO desmatricular (borra notas). Alcanza porque 1 alumno = 1 curso. |
| API Moodle | Web Services REST estándar. David da token (lectura total + escritura usuarios) + doc + estructura DB. |
| Alcance Moodle inicial | Listar alumnos + suspender/activar. Leer notas = 2ª capa. Crear usuarios = diferido. |
| Notificación al suspender | La manda **nuestra** app (Moodle no avisa). Canales: mail + **WhatsApp** (nuevo). |
| Inscripción simultánea | Reconfirmado: un alumno **no** está en dos cursos a la vez. Si se cambia, se suspende todo. (Validación backend ya existe.) |
| Grupos de pago | Grupo 1 vence 1–10 (recargo día 11); Grupo 2 vence 10–20 (recargo día 21). Selector al armar el plan + vista de deudores por grupo. |
| Modo cuotas | Opción **agrupar** (curso+matrícula+libros / N) o **no agrupar** (sólo curso). Máx 5 cuotas. **Editable manualmente** cuota por cuota. |
| Descuento inscripción | Sobre precio de lista. **Matrícula sin descuento**. Permitir **monto fijo O %**. |
| Libro en inscripción | Select de **colección** (no monto libre), 35% alumno automático, linkea a Editorial + Presupuesto. |
| Editorial — Colección | Unidad de venta (7 libros; anillada/tradicional = 2 precios). Páginas/% y autoras viven en el **libro**. |
| Autorías | 10% del precio de venta por libro. % por **cantidad de páginas**. Desglose por libro y por autora. Fijos por edición, editables. |
| Pases | Módulo nuevo. % descuento × precio de lista actual + RTP opcional. Contrato propio. Workflow de 3 alertas. Depende de Moodle (% uso). |
| Egresos | Cargar egresos en Presupuesto + catálogo de 11 categorías (las pasa Nico). |
| Cursos | Agrupar por ciclo lectivo / año. Anuales. Nico pasa lista final. |
| Export Excel | Exportar tablas (backup + balance anual). |
| Google Form alta alumnos | Diferido. |
| IVA | Reconfirmado fuera de alcance. |

---

## 6. Notas operativas

- **Próxima reunión**: viernes 12 de junio 2026, 11:00 — **demo de lo construido**. Posible suma de **coordinación / secretaría**.
- **Entorno de prueba**: se les habilita **después del 12-jun** (lo usan la semana del 15). Lo que carguen ahí no debería perderse (que persista para producción) — o que carguen poco, sólo para probar.
- **Productivo**: apuntado a **mediados/fin de junio – mediados de julio**, sujeto a reajustes.
- **Migración de datos**: IMEDBA prefiere **arrancar de cero** ("una pasada en limpio") para **unificar cursos** (el año pasado tenían cientos por la diversificación del examen único de residencia). No quieren cargar todo el histórico; cargan desde el mes de arranque y van para atrás.
- La transcripción de la **parte 2 del 05-06** es post-corte de llamada: Santi ya se había retirado; es Fran haciendo demo en vivo con Nico (alta de alumno + cobro + egresos).
