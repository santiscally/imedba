# 18 — "Dudas para la plataforma" (docx IMEDBA, 2026-09-24): plan

> **Insumo:** `dudas-plataforma-20260924.docx` (copia de lo que mandó IMEDBA). Son 7 pedidos: 1 de Libros, 4 de Académico, 1 de Finanzas (mails) y una tabla de roles.
> **Estado (2026-09-24, tarde):** §1–§6 **implementados** por Santi (back + front), ver §9. Pendiente: las cláusulas nuevas del contrato (§4, falta el adjunto) y los campos propios del alumno FS (§5, falta la lista). Todo lo de **mail es de Fran** (§7): va con diagnóstico, no hay que redescubrirlo.
> **Dueños:** `[SANTI]` backend/db/Keycloak · `[FRONT]` `frontend/` (lo implementa Fran, salvo que Santi diga otra cosa) · `[FRAN]` mail.

## Resumen

| # | Pedido | Causa / qué hay hoy | Dueño | Tamaño | Bloqueado |
|---|---|---|---|---|---|
| §1 | Colección toma $0 | El seed `V029` creó las colecciones con `price = 0` y el precio se carga a mano; nada lo calcula a partir de los libros | SANTI + FRONT | Chico | No |
| §2 | PREMA duplicado; diplomatura general + comisiones | Crear una diplomatura crea un curso FS "espejo", y además Cursos deja crear cursos FS → hay dos caminos. Cada comisión es una diplomatura aparte | SANTI + FRONT | Grande | Parcial (datos existentes, pregunta 3) |
| §3 | Cursos: sacar Editorial/General, separar RM y FS en Académico | Chips de unidad en Cursos + selector global de unidad en el Topbar | SANTI + FRONT | Mediano | No |
| §4 | Fecha de inicio/cierre del curso en el contrato + cláusulas nuevas | `ContractData` ya tiene `groupStart/groupEnd`, pero `Course` no los modela → sale "A confirmar" | SANTI + FRONT | Chico | **Cláusulas: sí** (pregunta 1) |
| §5 | Dos listados de alumnos (RM / FS) | `Student` no tiene unidad; `GET /students` **ignora** el `businessUnit` que manda el front | SANTI + FRONT | Mediano | **Sí** (pregunta 2) |
| §6 | Roles | `sync-roles.sh` sólo **agrega** permisos, nunca los saca; el menú se gatea con authorities de datos | SANTI + FRONT | Mediano | Parcial (preguntas 4–6) |
| §7 | Mail de cuotas: llegó el de "1 al 10" en la ventana 10–20 | Texto hardcodeado; además el Rec. 3 sale **después** de la suspensión | **FRAN** | Chico | No |

---

## §0 — Preguntas para IMEDBA

| # | Pregunta | Bloquea |
|---|---|---|
| 1 | **El adjunto con las cláusulas nuevas del contrato no vino en el docx.** Pedirlo. | §4 (cláusulas) |
| 2 | **¿Qué datos carga un alumno de Formación Superior?** ¿Y cuáles de los de RM no aplican (universidad, especialidad, concurso objetivo, IAR/PFO, lugar de residencia)? | §5 |
| 3 | Las diplomaturas/cursos FS ya cargados como separados (una por comisión): ¿los unificamos nosotros o los vuelven a cargar? ¿Hay productos FS que **no** sean diplomatura (ej. "Curso PAZ", doc 14 §1.1)? | §2 (migración de datos) |
| 4 | Vendedora "académico y editorial completo": ¿sigue registrando pagos y cuotas (están en Finanzas)? ¿Sigue viendo **sólo sus** inscripciones? | §6 |
| 5 | Secretaria "académico completo": hoy la de FS liquida PREMA, horas docentes y comisiones (Finanzas). Con este cambio lo pierde. ¿Es así? | §6 |
| 6 | Contable "todo": ¿incluye gestionar usuarios (hoy sólo admin)? | §6 |
| 7 | Un alumno que cursa en RM y en FS: ¿aparece en las dos listas con los datos de cada una? | §5 |

Defaults si no contestan: 4 → mantiene pagos y el scoping; 5 → pierde Finanzas; 6 → sin Usuarios; 7 → un registro por unidad.

---

## §1 — Colección en $0 `[SANTI + FRONT]`

**Causa.** `V029__seed_editorial.sql:80` inserta las colecciones con `price = 0`. El precio de la colección es un campo manual (`CollectionForm`, "Precio de lista") que no se deriva de los libros. La inscripción (`EnrollmentForm.librosPrice`) y la venta (`CollectionService.sell`) usan `collection.price` tal cual → $0. Confirmar en prod: `SELECT name, variant, price FROM collections WHERE deleted_at IS NULL;`

**Decisión.** El precio de lista de la colección **se calcula** como la suma del `sale_price` de sus libros, al leer. No hay override manual: el precio especial de colección ya lo da su `student_discount_pct` (35% vs el 30% del libro suelto). Guardarlo como snapshot lo dejaría viejo cuando cambie el precio de un libro.

**Backend**
- `CollectionService.toResponse` y `sell`: `price = Σ books.salePrice`. Un solo helper, usado por los dos.
- `CollectionCreateRequest.price` pasa a opcional e ignorado (compatibilidad con el front actual hasta que se despliegue el nuevo).
- `V043`: `ALTER TABLE collections ALTER COLUMN price DROP NOT NULL;` (la columna queda sin uso; se dropea más adelante).
- **Bug encontrado de paso:** `CollectionService.update` no persiste `businessUnit` → editar una colección no cambia su unidad. Arreglarlo en el mismo cambio.
- Tests: precio = suma; colección sin precios → 0; el reparto proporcional de `sell` no cambia.

**Front**
- `CollectionForm`: sacar el input "Precio de lista"; mostrar la suma en vivo de los libros tildados.
- `EnrollmentForm` y el `SellModal` de `Colecciones.tsx` no cambian (ya usan `c.price`).

---

## §2 — Diplomatura general + comisiones `[SANTI + FRONT]`

**Hoy.** `DiplomaService.create` crea un curso "espejo" FS (1 diplomatura ↔ 1 curso, `diplomas.course_id`), y en paralelo Cursos deja crear cursos FS a mano: de ahí el duplicado. Además cada cohorte se carga como una diplomatura distinta.

**Modelo objetivo**
- **Diplomatura** = el programa general: nombre, universidad, descripción, directoras.
- **Comisión** = una fila de `courses` con `business_unit = FORMACION_SUPERIOR` y un FK nuevo `courses.diploma_id`. Lleva lo que pidieron: matrícula, precio del curso, libro (`includes_prema_book`), número de comisión (`courses.commission`, ya existe), año, fecha de inicio/cierre (§4) y modalidad. La unidad de negocio es fija (FS) y se muestra read-only.
- **Por qué la comisión es un `Course` y no una entidad nueva:** inscripciones, cuotas, pagos, contrato, comisión de vendedora y `moodle_course_id` cuelgan de `course_id`. Así todo eso sigue funcionando sin cambios.

**Backend**
- `V044`: `courses.diploma_id UUID REFERENCES diplomas(id)` + índice parcial `WHERE deleted_at IS NULL`; backfill `UPDATE courses c SET diploma_id = d.id FROM diplomas d WHERE d.course_id = c.id`. `diplomas.course_id` queda deprecada y se dropea cuando el front nuevo esté en prod. Los precios de `diplomas` también quedan deprecados (pasan a la comisión).
- Endpoints (`diplomas:read` / `diplomas:write`): `GET/POST /diplomas/{id}/commissions`, `PUT/DELETE /diplomas/{id}/commissions/{courseId}`. `DiplomaResponse` suma `commissions[]`.
- `DiplomaCreateRequest` acepta un `firstCommission` opcional → el form de alta crea diplomatura + primera comisión en un solo POST. Se deja de crear el curso espejo.
- `CourseService.create/update`: rechaza `FORMACION_SUPERIOR` con 409 ("Las comisiones de Formación Superior se crean desde Diplomaturas"). Ver §3 para EDITORIAL/GENERAL.
- Liquidación PREMA: `DiplomaSettlementService` pasa a sumar los pagos de **todas** las comisiones de la diplomatura (`PaymentRepository.sumByCoursesBetween(List<UUID>, …)` en vez de `sumByCourseBetween`). Liquidar por comisión sigue diferido (doc 17 §2 #2); con este modelo después es trivial.
- `modules/diplomaenrollment/` no lo usa el front: no se toca.

**Datos existentes (prod), antes de `V044`**
1. Listar cursos FS sin diplomatura: `SELECT … FROM courses WHERE business_unit = 'FORMACION_SUPERIOR' AND id NOT IN (SELECT course_id FROM diplomas WHERE course_id IS NOT NULL)`.
2. Listar diplomaturas que son el mismo programa con otra comisión (por nombre).
3. Según la pregunta 3: los que no tengan inscripciones → soft delete; los que tengan → se cuelgan de la diplomatura general a mano, con script en `release-notes/`. Unificar dos diplomaturas mueve también sus `diploma_settlements`. Precedente del 30-jul: Nico prefirió "se carga de vuelta y listo".

**Front**
- `DiplomaForm`: datos generales + (sólo en alta) el bloque de primera comisión, con los mismos campos que el form de curso.
- `DiplomaDetail`: tabla de comisiones + "Nueva comisión" (reutiliza `CourseForm` en modo FS).
- `EnrollmentForm`, selector de curso: `optgroup` RM / FS; las comisiones se muestran como `<Diplomatura> · Com. N (año)`.

---

## §3 — Cursos sólo RM + Académico partido en dos `[SANTI + FRONT]`

**Pedido.** Sacar Editorial y General de Cursos (son unidades que no son académicas), y separar las dos áreas dentro de ACADÉMICO. Junto con §2, Cursos queda **sólo para RM**: FS vive en Diplomaturas.

**Backend**
- `CourseService`: el alta directa acepta sólo `RESIDENCIAS`. El enum `BusinessUnit` no cambia: `EDITORIAL` y `GENERAL` los siguen usando presupuesto, libros y colecciones.
- `GET /enrollments` no tiene filtro por unidad (sólo `studentId/courseId/status/contractSigned`): sumar `businessUnit` (por `course.businessUnit`) para las dos listas de inscripciones.
- Chequear si hay cursos EDITORIAL/GENERAL en prod: `SELECT business_unit, count(*) FROM courses WHERE deleted_at IS NULL GROUP BY 1;`

**Front**
- `Cursos.tsx`: sacar los chips; la lista fuerza `businessUnit=RESIDENCIAS`. `CourseForm` sin selector de unidad.
- Sidebar, grupo Académico con dos subgrupos:
  - **Residencias Médicas:** Alumnos, Cursos, Inscripciones
  - **Formación Superior:** Alumnos, Diplomaturas (con comisiones), Inscripciones
  - Comunes: Personal Académico, Clases
- Rutas `/rm/*` y `/fs/*`, con redirects desde las viejas. Una misma página parametrizada por unidad; nada de duplicar componentes.
- El selector global de unidad del Topbar (`lib/unidad.tsx`) se elimina: se había elegido "en vez de dos grupos en el sidebar" y ahora el cliente pide justamente los dos grupos. Si el Dashboard necesita filtrar, pasa a tener un filtro propio.

---

## §4 — Fecha de inicio/cierre + cláusulas del contrato `[SANTI + FRONT]`

- `V045`: `courses.start_date DATE`, `courses.end_date DATE`, `CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)`.
- `CourseCreateRequest/UpdateRequest/Response` + `CourseForm` + form de comisión (§2). Obligatorias en el alta nueva; los cursos viejos quedan en null → el contrato sigue diciendo "A confirmar".
- `EnrollmentService.contractDataFrom` (hoy pasa `null, null`): pasar `c.getStartDate(), c.getEndDate()`. `ContractPdfRenderer` ya los renderiza.
- **Cláusulas nuevas: BLOQUEADO** (pregunta 1). Cuando lleguen: `ContractPdfRenderer.CLAUSES` + `contratos/contrato-template-final.docx` + `15-contrato-alumno-template.md`. Ver si agregan variables nuevas.
- `ContractPdfRenderer` lo escribió Fran (feature de mail); el texto del contrato no es mail, así que lo toca Santi, pero **avisar en el DIARIO**.

---

## §5 — Dos listados de alumnos `[SANTI + FRONT]` — bloqueado por la pregunta 2

**Hoy.** `Student` no tiene unidad. `StudentController.list` sólo acepta `q`; el `businessUnit` que manda el front se ignora (lo admite el comentario en `frontend/src/api/students.ts:17`). O sea que el selector de unidad **nunca filtró Alumnos en el back real**.

**Decisión.** Columna explícita `students.business_unit` (RESIDENCIAS | FORMACION_SUPERIOR). Derivarla de las inscripciones no alcanza: el form tiene que saber qué campos pedir **antes** de que exista la inscripción.

> **Corrección al implementar:** "un registro por unidad" no se puede, porque email y DNI son únicos (`uk_students_email_active`, `uk_students_dni_active`). Quedó así: la columna es la **unidad de alta**, y el listado de una unidad trae a los de alta en ella **más** a los que tienen alguna inscripción en ella. Un alumno que cursa en las dos aparece en las dos listas, y la inscripción cruzada **no** se bloquea.

- `V046`: columna + backfill por inscripciones → `courses.business_unit`. Listar antes los que tienen inscripciones en las dos unidades (pregunta 7) y los que no tienen ninguna (default RESIDENCIAS). Después, `NOT NULL`. Los campos FS entran en la misma migración cuando IMEDBA los mande.
- `GET /students?businessUnit=` filtra de verdad; el alta exige unidad; validación de campos por unidad.
- Inscripción: `student.businessUnit` tiene que coincidir con la del curso (409 si no).
- Front: `/rm/alumnos` y `/fs/alumnos` con el mismo componente; `StudentForm` y las columnas cambian según la unidad; el picker de alumno de `EnrollmentForm` se filtra por la unidad del curso.

---

## §6 — Roles y permisos `[SANTI + FRONT]`

| Cliente | Rol Keycloak | Qué cambia |
|---|---|---|
| admin: acceso total | `ADMIN` | Nada. |
| vendedora: académico + editorial completo | `VENDEDORA` | **Suma** `courses:write`, `diplomas:*`, `staff:*`, `hour_logs:*`, `teaching:read`, `authors:*`, `editorial:*`, `stock:*`. Mantiene `payments/installments` y el scoping (pregunta 4). |
| secretaria: académico completo | **`SECRETARIA`** (nuevo, reemplaza `SECRETARIA_FS` y `SECRETARIA_RM`) | Académico completo (alumnos, cursos, inscripciones, diplomaturas, personal académico, clases) + lectura de cuotas. **Pierde** `settlements:*` y `sales_commissions:*` (pregunta 5). |
| editorial: sólo editorial | `EDITORIAL` | Deja de ver Dashboard y Alumnos (ver punto 4 de abajo). |
| contable: todo | `CONTABLE` | Todo `ALL_AUTH` menos `admin:manage` (pregunta 6). |
| — | `VIEWER` | No lo mencionan: sin cambios. |

**Trampas técnicas (las cuatro hay que resolverlas o el cambio no aplica)**
1. **`grant` en `keycloak/sync-roles.sh` sólo agrega.** Para restringir EDITORIAL y SECRETARIA hace falta un paso de reconciliación: leer los composites del rol (`kcadm get-roles --rname X --cclientid imedba-backend`) y sacar con `remove-roles` los que no están en la lista deseada. Sin eso, en el Keycloak de prod (que ya existe) los permisos viejos quedan. Es la misma familia de bug que el del 25-ago.
2. `keycloak/realms/imedba-realm.json`: reflejar los mismos composites (primer import / `down -v`).
3. `KeycloakAdminClient` (lista de roles asignables, línea 34) y `frontend/src/types/user.ts`: sumar `SECRETARIA` y sacar FS/RM del selector. Migrar los usuarios que tengan `SECRETARIA_FS/RM`.
4. **El menú se gatea con authorities de datos** (`lib/access.ts`): `/dashboard` y `/alumnos` piden `students:read`, `/liquidaciones` pide `diplomas:read`. Consecuencias: EDITORIAL necesita `students:read` para el picker de alumno en la venta (`BookSaleForm` usa `studentsApi.list`), y con eso ve Dashboard y Alumnos; SECRETARIA, con `diplomas:read`, vería Liquidaciones. Fix: `/liquidaciones` → `settlements:read`, y una authority nueva `academico:read` que gatea las rutas de Académico (se asigna a ADMIN, VENDEDORA, SECRETARIA, CONTABLE, VIEWER). Los endpoints no cambian.

Actualizar `10-usuarios-y-roles.md`. Verificación: un token por rol → menú visible + una escritura por sección + 403 donde corresponde.

---

## §7 — Mails de cuotas `[FRAN]`

**Contexto.** Hay dos grupos de pago (`PaymentGroup`): `GROUP_1` vence el día 10 (ventana 1–10) y `GROUP_2` vence el 20 (ventana 10–20).

**Bug 1 — el reportado: el Recordatorio 1 siempre dice "del 1 al 10".**
- `NotificationTemplates.installmentDueSoon` (~línea 140) tiene hardcodeado *"el pago de las cuotas debe ser realizado del 1 al 10 de cada mes"*.
- `NotificationScheduler.enqueueInstallmentDueSoonJob` lo manda el día anterior al vencimiento. Un alumno de `GROUP_2` recibe el día 19 un mail que dice "del 1 al 10": es exactamente lo que reportaron.
- Fix: pasarle al template el `PaymentGroup` (o el `dueDay`) → "del 1 al 10" / "del 10 al 20" y "recargo a partir del 11" / "del 21". Revisar que Rec. 2 y Rec. 3 no tengan el mismo supuesto.

**Bug 2 — no reportado, lo encontré revisando: el Recordatorio 3 llega DESPUÉS de la suspensión.**
- `NotificationScheduler.PRE_SUSPENSION_DAYS = 20` cuenta días **desde el vencimiento**: con vencimiento el 10, el aviso sale el día 30.
- `InstallmentScheduler.MOODLE_SUSPEND_DAYS = 12` suspende el día 22 (10 + 12).
- La regla (`CLAUDE.md`) es aviso el día 20 y suspensión el 22, y el texto del Rec. 3 dice *"en las próximas 48hs deberemos proceder a la suspensión"*. Hoy sale 8 días después de suspender. El job de aviso no depende de `MOODLE_AUTO_SUSPEND_ENABLED`, así que el mail sale igual aunque la suspensión esté apagada.
- Fix: `PRE_SUSPENSION_DAYS = MOODLE_SUSPEND_DAYS - 2` (= 10), derivado de la otra constante para que no se vuelvan a desalinear.

**Para cerrar**
- Tests: template por grupo (los dos textos) y offset del Rec. 3 relativo a la suspensión. Existe `scripts/test-mail-cuota-vencida.mjs` para la prueba e2e.
- Confirmar con IMEDBA si el Rec. 1 va el día antes del vencimiento (como está hoy) o al abrir la ventana (día 1 / día 10).
- Confirmar en qué entorno le llegó el mail: según el DIARIO del 25-ago, prod estaba en Noop hasta verificar el dominio en Resend.
- Si hace falta migración, usar **V048 en adelante** (este plan usó V043–V047; ver la colisión del 01-ago).

---

## §8 — Orden de ejecución

| Tanda | Qué | Depende de |
|---|---|---|
| A | §1 colección · §4 fechas (sin cláusulas) · §7 (Fran, en paralelo) | — |
| B | §6 roles | preguntas 4–6 (o los defaults) |
| C | §2 + §3 juntos, en la misma rama: Cursos deja de aceptar FS en el mismo momento en que Diplomaturas empieza a crear comisiones | pregunta 3 para los datos viejos |
| D | §5 alumnos | pregunta 2 |
| E | Cláusulas del contrato | pregunta 1 |

**Migraciones usadas:** `V043` colecciones · `V044` `courses.diploma_id` · `V045` fechas de curso · `V046` unidad del alumno · `V047` arreglo de cursos FS huérfanos. Los campos FS del alumno irán en una nueva cuando lleguen.

---

## §9 — Implementado (2026-09-24)

Verificado: 127 tests unitarios del backend (Maven en contenedor JDK 21), `tsc -b` + `vite build`, lint sin errores nuevos, y una prueba e2e contra el stack local (V043–V046 aplicadas sobre los datos que había, tokens reales de Keycloak por rol): 35 chequeos, todos OK. Pasó por code review: se agregó `@NotNull` a las fechas en el alta de curso y de comisión (antes sólo lo exigía la UI). Los tests de integración con Testcontainers no corren en esta máquina; se actualizaron `CourseApiIntegrationTests` y `StudentApiIntegrationTests`.

| § | Qué quedó |
|---|---|
| §1 | Precio de colección = suma de sus libros, calculado al leer. `CollectionForm` muestra la suma y ya no pide precio. De paso: editar una colección ahora sí guarda la unidad. |
| §2 | Diplomatura general + comisiones (`/diplomas/{id}/commissions`). El alta de la diplomatura crea la primera comisión. La liquidación PREMA suma lo cobrado en todas. Se dejó de crear el curso espejo. |
| §3 | Cursos sólo acepta Residencias (400 si no). Una comisión no se edita ni se borra por `/courses` (409). Menú Académico partido en Residencias Médicas / Formación Superior, rutas `/rm/*` y `/fs/*` (las viejas redirigen). Se eliminó el selector de unidad del Topbar. |
| §4 | Inicio y cierre en cursos y comisiones (obligatorios en el alta, también en la API) y en el contrato. El form de curso de Residencias ya no ofrece "Incluye libro PREMA": el cliente lo pidió sólo para Formación Superior (doc 17 §5.4); los cursos que ya lo tenían lo conservan. |
| §5 | Unidad de alta del alumno + listados RM/FS reales (ver la corrección). Inscripciones filtran por unidad. El form de inscripción sólo ofrece alumnos y cursos de su unidad. |
| §6 | Tabla de roles aplicada, `sync-roles.sh` declarativo, rol `SECRETARIA`, Dashboard por `dashboard:read`, liquidación PREMA por `settlements:*`. Detalle en `10-usuarios-y-roles.md`. |

**Hallazgos de la prueba (no se tocaron):**
1. **Inscribir a un curso que "incluye libro PREMA" con stock 0 da error de integridad** (`ck_books_stock`) en vez de un 409 legible. Pasaba antes de este cambio. Por eso el tilde de libro PREMA en una comisión nueva arranca **apagado**.
2. **La colección anillada va a seguir en $0 si sus libros tienen precio 0.** En la base local los 7 libros anillados tienen `sale_price = 0`. Revisar en prod y cargarles precio.
3. **Al desplegar, `sync-roles.sh` le saca a ADMIN** `enrollments:approve`, `teaching:write` y `recurring_services:*`: ningún endpoint los usa. **A SECRETARIA_FS le saca** liquidaciones y comisiones: es lo que pidió el cliente.
4. **Datos en prod:** los cursos FS sin diplomatura los arregla **`V047`** en el deploy (los cuelga de la diplomatura de su programa y completa el número de comisión si el nombre lo trae). Lo que necesita decisión (cursos EDITORIAL/GENERAL, diplomaturas duplicadas por comisión, comisiones sin número, cursos sin fechas, libros de colección en $0) lo lista `scripts/sql/diagnostico-deploy.sql`. Procedimiento en el README, "Base de datos en el deploy".
