# 17 — Correcciones IMEDBA + rework de Liquidaciones (jul-2026)

> **Owner:** Santi (backend). Items marcados `[FRAN]` tocan `frontend/` — no se tocan sin pedido explícito.
> **Estado:** **todo el plan implementado.** Las 3 liquidaciones (comisiones, PREMA v2, horas docentes), Personal Académico, contrato, libro-por-unidad y tipos de curso — back + front, verificado contra el stack corriendo. Lo único que falta es la plantilla del mail que pide la factura, diferida por Santi.

## 0. Estado de implementación (2026-07-31)

> **Nota de propiedad:** el 2026-07-30 Santi autorizó tocar `frontend/` mientras Fran está de vacaciones. Los items marcados `[FRAN]` se implementaron; hay que avisarle al volver.

| Item | Estado |
|---|---|
| §3.1 Comisiones de vendedora | ✅ **Hecho, back + front.** 15 tests contra la planilla de junio. Dos bugs propios corregidos en autorevisión (§9.5). UI en §9.7. |
| 5.1 Descarga de contrato | ✅ **Hecho, back + front.** Root cause: no existía el endpoint (§9.2). |
| 5.2 Tildar contratos firmados + filtro | ✅ **Hecho, back + front** (§9.3, §9.7). |
| §4 Personal Académico | ✅ **Hecho, back + front.** `V037` + CRUD + 5 tests (§9.6, §9.7). |
| 5.6 Entrada general de liquidaciones | ✅ **Hecho.** `/liquidaciones` ahora tiene selector de tipo (§9.7). |
| §3.3 PREMA v2 + 5.5 (sacar % directora) | ✅ **Hecho, back + front.** `V038` + motor reescrito + 12 tests. Ver §9.8. |
| 5.4 Libro PREMA condicional | ✅ **Hecho, back + front.** `V039` + filtro por unidad. Ver §9.9. |
| Tutora → casilla (no rol) | ✅ **Hecho, back + front.** `V039`. Ver §9.9. |
| §3.2 Docentes/preceptoras | ✅ **Hecho, back + front.** `V040` + grilla de clases + motor + 12 tests. Ver §9.10. |
| 5.3 Tipos y modalidad de curso | ✅ **Hecho, back + front.** `V041` + filtros combinables. Ver §9.12. |
| Plantillas de mail de pedido de factura | ✅ **Hecho.** `V042` + las 2 plantillas de Nico + 12 tests. Ver §9.13. |
| Errores de cliente que salían como 500 | ✅ **Hecho.** `BadRequestException` + 404 para paths inexistentes (§9.14). |

> **Actualización 2026-07-30.** Santi mandó las preguntas a Nico recortadas a 6, descartando *"todo lo que implicaba cosas ya cargadas, porque se carga de vuelta y listo"*. Eso **resuelve §7.4 y §7.5**: no hay que migrar liquidaciones viejas ni mapear los cursos MIX / Super Intensivo. Con eso PREMA v2 quedó desbloqueado y se hizo. **Más tarde ese mismo día Nico contestó todo y mandó la planilla completa** (había exportado una sola hoja): §7.1, §7.2, §7.7 y §7.10 resueltos → ver §3.2 y §9.9. **Ya no queda nada bloqueado.**

## 1. Fuentes

| Archivo | Qué aporta |
|---|---|
| `transcripcion-reunion-20260724.pdf` | Llamada Santi ↔ Nico (Imedba Cobranzas), 24-jul-2026, 33 min. Define alcance y **qué se descarta**. |
| `correcciones-imedba-20260723.docx` | Lista escrita de correcciones (fecha del doc: 23/7/2026). |
| `liquidaciones-especificacion-20260724.docx` | Fórmulas de las 3 liquidaciones (PREMA, Docentes/Preceptoras, Comisiones). |
| `liquidacion-comisiones-junio2026.csv` | Planilla real de junio-2026 (export de una sola hoja). **Valida la fórmula de comisiones.** |
| `liquidaciones-planilla-completa-20260730.xlsx` | **La planilla completa**, con las 3 hojas: `PREMA`, `HS DOCENTE`, `COMISIONES`. El CSV anterior era sólo la última: Nico lo había exportado mal. **Valida las fórmulas de PREMA (6 meses) y aporta la grilla real de horas docentes.** |

Notas de higiene del repo:
- `Meeting Transcription (3) (1).pdf` es **byte-idéntico** (md5 `22716eb5…`) a `transcripcion-reunion-20260612.pdf`. Es un duplicado tracked; borrarlo cuando se confirme.
- ~~La planilla de horas docentes no fue enviada~~ → **llegó el 2026-07-30** en el xlsx completo (hoja `HS DOCENTE`). Con eso y las respuestas de Nico, **las 3 fórmulas quedaron cerradas**.

---

## 2. Qué NO se hace — y por qué

El presupuesto (`Presupuesto IMEDBA.pdf`, $900.000, 25-feb-2026) cubre: alumnos y pagos, contratos, cobro automatizado, Moodle, stock editorial, notificaciones a **alumnos**, presupuesto general por categorías con egresos, y roles. No cubre módulos nuevos.

| # | Pedido | Veredicto | Evidencia |
|---|---|---|---|
| 1 | **Alerta de pagos**: pestaña nueva en Finanzas para controlar cuándo pagar autorías, tutoras, sueldos, proveedores, comisiones — anualizadas y mensuales | **FUERA.** Es un módulo nuevo (calendario de vencimientos internos + motor de recurrencia + alertas). No presupuestado. | `correcciones-imedba-20260723.docx` §Financiero. El propio Nico lo baja en la llamada: *"la alarma del pago de tutoras… no hace falta ahora, dijimos"* (32:04). El presupuesto solo contempla notificaciones **a alumnos** (vencimientos, pagos, suspensiones, bienvenidas). |
| 2 | **Liquidar por comisión** (cohorte académica) además de por mes | **DIFERIDO.** Acordado en la llamada. | Nico 19:42: *"si se puede hacer primero por mes lo hacemos por mes y después hacemos lo de las comisiones"*. Santi 19:58: *"primero vayamos por mes"*. |
| 3 | **Alimentar los inputs de la liquidación desde el Presupuesto** (leer sueldo secretaria / publicidad / admin desde los asientos del mes en vez de cargarlos a mano) | **FUERA.** Cliente lo descartó en vivo. | Nico lo propone a los 18:13 (*"el de secretaria yo cuando hago el pago lo registro, y que me lo mande a la liquidación del mes"*) y lo baja él mismo a los 18:33: *"quizás es medio engorroso, por mí es más simple si voy cargando los datos yo directo acá… no hace falta tener esa conexión porque son datos que son medio manuales. Puede ir aislado."* Los 4 montos fijos se siguen cargando a mano en la liquidación. |
| 3b | ⚠️ **Corrección de lectura.** La dirección **inversa** —liquidación PAID → asiento de egreso en Presupuesto— **sí la quiere** (17:32: *"cuando doy el okay de que me mandaron la factura y lo pagamos, ese monto se mande al presupuesto"*) y **ya está implementada** (`DiplomaSettlementService.createBudgetExpenses`, pedido del 2026-06-09). | **SE MANTIENE**, hay que actualizarla al modelo nuevo (§3.3): agregar GASTOS VARIOS y grabaciones, y cambiar el asiento «Universidad» por «UNTREF acumulado». | — |
| 4 | **Banco de preguntas específico por región** | **FUERA (futuro).** | `correcciones…docx`: *"por ahora es universal, quizás más adelante"*. |
| 5 | **Pago del acumulado UNTREF al cerrar la comisión** | **DIFERIDO** — depende de #2. Por ahora el 20% solo se acumula y se muestra. | Nico 19:42: *"cuando termina una comisión ahí se ha acumulado el 20% … se paga"*. |

Todo lo demás del docx entra: son correcciones de comportamiento existente + la pestaña Personal Académico (chica) + el rework de liquidaciones (que hoy **calcula mal**).

---

## 3. Liquidaciones — fórmulas

Tres plantillas bajo un único punto de entrada. Hoy `/liquidaciones` obliga a elegir una diplomatura primero; eso se saca (Nico 24:38: *"que sea liquidaciones general y que uno elija liquidar la diplomatura PREMA, las horas docentes, las ventas y comisiones"*).

Convención de redondeo transversal: **`BigDecimal`, `HALF_UP`**. Dónde se redondea está especificado por liquidación (importa: en comisiones cambia el resultado).

---

### 3.1 Comisiones de vendedora — **VERIFICADA contra la planilla de junio**

#### Regla

1. La base **no es lo facturado, es lo cobrado**. Cada venta se descompone en cuánto entra en cada mes (`INGRESA JUNIO`, `INGRESA JULIO`, …).
   *docx: "El cálculo lo hacemos por lo cobrado, entonces se distribuye en los siguientes meses como es que va a entrar."*
2. Las ventas de **cursos/productos** se numeran por mes de venta: **ventas 1 a 30 → 0,5%; venta 31 en adelante → 1%**.
3. La alícuota queda **fijada por el rango de la venta dentro de su mes de origen** y se aplica a **todas** sus cuotas futuras, se cobren cuando se cobren. (Por eso la planilla mantiene filas separadas de 0,5% y 1% a lo largo de todas las columnas de meses.)
4. Los **libros sueltos y colecciones** van siempre a **0,5%** y **no cuentan** para el conteo de 30.
   *docx: "Los libros siempre son el 0.5%."*
5. Los **libros incluidos dentro de una venta de curso** (columna `Libros` de la planilla) **no se separan**: forman parte del monto cobrado de esa venta y van a la alícuota del curso.
6. La comisión de un mes M incluye lo cobrado en M por ventas de **meses anteriores** (la fila `COMISIONES MES ANTERIOR`).
   *Nico 28:39: "voy a [mayo], [miro] lo que va a entrar en junio y se lo agrego al pago acá."*

#### Fórmula canónica

Los puntos 2/3/6 colapsan en una sola expresión:

```
comision_vendedor(V, mes M) =
    Σ  cobrado(v, M) × alicuota(v)
    v ∈ ventas de V, de cualquier mes de origen

alicuota(v) =
    0,005                      si v es venta de libro/colección suelta
    0,005                      si rank(v) ≤ 30
    0,010                      si rank(v) ≥ 31

rank(v) = posición ordinal de v entre las ventas de curso/producto
          del vendedor V en el mes de origen de v,
          ordenadas por fecha de venta ASC (desempate: created_at ASC).
          Las ventas de libros sueltos NO consumen posiciones.
```

**Redondeo:** la comisión por línea se calcula sin truncar. Los subtotales por bucket se redondean **solo para mostrar**. El **total pagable se redondea una sola vez, al final, sobre la suma sin redondear.** Esto no es cosmético: replica exactamente la planilla (ver validación).

#### Validación aritmética contra `liquidacion-comisiones-junio2026.csv`

Junio-2026: 34 ventas. Filas 2–31 = 30 ventas de curso (rank 1..30). Filas 32–35 = 3 libros sueltos + 1 colección.

| Bucket | Base (Σ cobrado en junio) | × alícuota | Calculado | Planilla | ✓ |
|---|---:|---|---:|---:|:-:|
| Cursos 1–30 (0,5%) | 24.948.651 | ×0,005 | 124.743,255 | **124.743,26** | ✓ |
| Cursos 31–49 (1%) | 0 | ×0,010 | 0 | **0** | ✓ |
| Libros Tienda Nube (0,5%) | 505.157 | ×0,005 | 2.525,785 | **2.525,79** | ✓ |
| Comisiones mes anterior | — | — | — | 59.524,46 | (dato externo) |
| **TOTAL** | | | **186.793,50** | **$186.793,50** | ✓ |

Proyección de los meses siguientes (mismas ventas de junio, cuotas futuras) — también validada:

| Mes de cobro | Σ cobrado | ×0,5% | Planilla | ✓ |
|---|---:|---:|---:|:-:|
| Julio | 3.051.339 | 15.256,695 | 15.256,70 | ✓ |
| Agosto | 2.841.339 | 14.206,695 | 14.206,70 | ✓ |
| Septiembre | 2.841.339 | 14.206,695 | 14.206,70 | ✓ |
| Octubre | 2.841.339 | 14.206,695 | 14.206,70 | ✓ |
| Noviembre | 2.841.339 | 14.206,695 | 14.206,70 | ✓ |
| Diciembre | 195.000 | 975,00 | 975,00 | ✓ |

Notas de la verificación:
- **Sobre el redondeo:** si se suman los buckets **ya redondeados** da 186.793,**51**. La planilla dice 186.793,**50**, que es lo que sale de sumar sin redondear y redondear al final. Confirmado el criterio del punto anterior.
- **El agujero de agosto:** la caída de julio (3.051.339) a agosto (2.841.339) es exactamente $210.000 y se debe a que la fila 21 (Wilson Oyuela, Curso PUR) tiene la letra `g` tipeada en la celda de agosto en vez del monto. Es un **error de tipeo de la planilla**, no una regla. El sistema no lo replica.
- **Celda huérfana:** la fila `CURSOS DEL 30 AL 49 (1%)` tiene `$3.360,00` en la columna 20 (`CURSOS RM AR…`), que no es una columna de mes. Es 1% × 336.000 — un arrastre de fórmula. No corresponde a ningún cobro real de junio. Ignorar.
- El título de la fila dice *"CURSOS DEL 30 AL 49"* pero el docx dice *"a partir de la 31"*. Vale el docx: la venta 30 va a 0,5% (en junio hubo exactamente 30 y todas fueron 0,5%, así que la planilla no desambigua). Confirmado por *"las primeras 30 se pagan 0.5%"*.

#### Implementación

Todo se deriva de datos que **ya existen** — no hace falta replicar la grilla a mano. Es la ganancia grande de esta liquidación.

- Cobros de cursos → `payments (payment_date, amount, enrollment_id)`.
- Cobros de libros → `book_sales (sale_date, total_amount, enrollment_id, sold_by)`.
- Vendedora → `enrollments.enrolled_by` (sub de Keycloak) y `book_sales.sold_by`.
- Regla de asignación de bucket para `book_sales`: `enrollment_id IS NOT NULL` → es libro **incluido en la venta del curso** → hereda la alícuota del curso (punto 5). `enrollment_id IS NULL` → bucket libros, siempre 0,5% (punto 4).

Tablas nuevas:

```
sales_commission_settlements
  id, seller_user_id (uuid keycloak), period_year, period_month,
  courses_base_tier1, courses_commission_tier1,     -- 0,5%
  courses_base_tier2, courses_commission_tier2,     -- 1%
  books_base,         books_commission,             -- 0,5%
  prior_months_base,  prior_months_commission,      -- ventas de meses anteriores cobradas en este mes
  total_commission,                                  -- redondeo único acá
  tier1_rate, tier2_rate, books_rate, tier_threshold, -- snapshot editable de los parámetros
  status (DRAFT|APPROVED|PAID), created_at, ...
  UNIQUE (seller_user_id, period_year, period_month)

sales_commission_lines            -- detalle auditable, snapshot al liquidar
  id, settlement_id, source_type (ENROLLMENT|BOOK_SALE|DIPLOMA_ENROLLMENT),
  source_id, student_name, product_name,
  sale_date, sale_month_rank, rate_applied,
  collected_amount, commission_amount
```

`tier1_rate/tier2_rate/books_rate/tier_threshold` se guardan por liquidación (mismo criterio que V018 para diplomaturas: los parámetros se congelan al liquidar, no se leen en vivo).

⚠️ **Colisión de nombres a evitar:** `courses.commission` (V030) es el **número de cohorte académica**, no una comisión de venta. En el módulo nuevo usar siempre `sales_commission_*` / `salesCommission*`.

---

### 3.2 Docentes y preceptoras

> **Actualizado 2026-07-30** con la planilla real (`liquidaciones-planilla-completa-20260730.xlsx`, hoja **HS DOCENTE**) y las respuestas de Nico. **La fórmula quedó cerrada.**

#### Grilla — columnas reales de la planilla

Las columnas exactas de la hoja HS DOCENTE (no las que se habían inferido de la transcripción):

`Fecha · Comisión · Materia · Clase · Sinc · Asinc · Horario planificado · Cuenta Zoom · Apellido y Nombre · Horas reales · Cantidad de horas a pagar · link · Preceptora`

Diferencias con lo que se había asumido:
- **Sincrónica y asincrónica son dos columnas separadas** con una `X`, no un campo único.
- Hay **`Cuenta Zoom`** y **`link`**, que no estaban en la lista inferida.
- **La preceptora se asigna por clase**, en su propia columna — no es un rol de la fila docente. En junio: Ailen, Juana y Tere.
- `Comisión` mezcla cohortes de PREMA (`COM 9`, `COM 10`) con `comunidad imedba`, que es Residencias. Confirma que esta liquidación cruza las dos unidades.
- **`Horas reales` viene como texto libre**: `"2 h 50"`, `"2 h 45"`, `"3 h 20"`, `"2"`. No es un número — hay que parsearlo o cambiar la carga a un campo numérico.
- **`Cantidad de horas a pagar` está vacía en toda la planilla de junio.** Es la columna que completa Cobranzas y en la práctica todavía no se usa.

#### Lo que respondió Nico (2026-07-30)

- **El 25% es la opción (a):** *"por cantidad de clases se agrega el 0.25 valor hora"*. Se **suma un cuarto de hora por clase**, no se recarga el total.
- **Las asincrónicas quedan fuera:** *"las asincrónicas no tienen preceptora. Podés desestimarlas y que sea solo una liquidación de clases en vivo."* → la liquidación filtra por `Sinc = X`.
- **Valor hora preceptora: $6.500.** (Docente: $75.000.)
- **Preceptoras: Juana, Teresa y Ailen.** **Ailen queda fuera de la liquidación** — cobra sueldo y hace varias tareas. Es exactamente el caso que cubre `paid_by_hours = false` (§9.6).
- **Tutora no es un rol**, es una casilla sobre una docente. Ya implementado (§9.9).

- **Secretaria** carga todo salvo `HORAS A PAGAR`. `horas previstas` viene del cronograma (semi-fijo); `horas reales` se carga a fin/principio de mes — *"decía que iba a ser de dos horas y duró dos horas y media, para pagarle esa media hora"* (11:41).
- **Cobranzas** carga `HORAS A PAGAR` — es el chequeo final que fija el monto a facturar. *docx: "todas menos la casilla HORAS A PAGAR que es la que completa el área de cobranzas… es más que nada para el chequeo final."*
- Base de cálculo = `HORAS A PAGAR`, **no** `horas reales`.

#### Fórmulas — CERRADAS

Sólo entran las clases **sincrónicas** (`Sinc = X`). Las asincrónicas no tienen preceptora y quedan fuera de la liquidación entera.

```
DOCENTE (por cada docente, sumando sus clases sincrónicas del mes):
    total = Σ horas_a_pagar × valor_hora_docente
    valor_hora_docente = $75.000                        [editable]

PRECEPTORA (por cada preceptora, sumando las clases donde figura):
    total = (Σ horas_a_pagar + 0,25 × nro_clases) × valor_hora_preceptora
    valor_hora_preceptora = $6.500                      [editable]

    El 0,25 es un cuarto de hora POR CLASE (los 15 min de anticipación),
    no un recargo del 25% sobre el total. Confirmado por Nico el 2026-07-30.

    Quien tenga `paid_by_hours = false` NO entra (caso Ailen: cobra sueldo).
```

⚠️ **La preceptora sale de la columna `Preceptora` de cada fila**, no del rol de la docente: una misma clase tiene una docente y una preceptora distintas, y la preceptora se asigna clase por clase.

⚠️ **`Horas reales` viene como texto** (`"2 h 50"`). Al implementar hay que decidir: parsear ese formato o cambiar la carga a numérico. Lo segundo es más sano — el parseo de texto libre va a fallar el día que alguien escriba `"2hs 50"`.

#### Salida

Al confirmar `HORAS A PAGAR`, se arma el mail a la docente con: detalle de clases, horas y total, más los datos para la factura. Reusa el motor de mail de `feat(mail)` (commit 57844d4) — plantilla nueva, no infraestructura nueva. Nico envía la plantilla por mail aparte.

#### Estado actual del código

`hour_logs` (V013) ya tiene `staff_id / activity_type / period / hours / rate_per_hour / total_amount` + flujo de factura (`invoice_email_sent_at → invoice_received → paid_at`). Falta:
- Campos de la grilla: `commission`, `subject` (materia), `class_label`, `is_synchronous`, `schedule`, `planned_hours`, `hours_to_pay`, `class_count`.
- Separar `horas reales` (`hours`, secretaria) de `horas a pagar` (`hours_to_pay`, cobranzas) — hoy hay un solo campo.
- `total_amount` pasa a calcularse con la fórmula por tipo (docente vs preceptora).
- Rate por tipo de staff: hoy `activity_types.applies_to` solo admite `DOCENTE|TUTORA|ALL` — falta `PRECEPTORA` y `DIRECTORA`.

Nota sobre tutoras (13:22, ambiguo en la transcripción): hay dos que se liquidan por horas (Juana y Tere) y una que cobra **sueldo fijo** y no entra en esta liquidación. Se resuelve con un flag `paid_by_hours` en Personal Académico, no con lógica especial.

---

### 3.3 PREMA / Diplomatura

La más engorrosa y **la que hoy está mal implementada**.

#### Fórmula correcta

```
BASE            = total cobrado del mes por la diplomatura        [auto, ya existe]

(1) impuestos   = BASE × pct_impuestos_y_gastos_bancarios         [%, editable, PRIMER descuento]
    SUBTOTAL_1  = BASE − impuestos                                 [«verde» en la planilla]

(2) gastos administrativos — CUATRO MONTOS FIJOS, no porcentajes:
    SECRETARIA + PUBLICIDAD + ADMINISTRACION + GASTOS_VARIOS
    SUBTOTAL_2  = SUBTOTAL_1 − (los cuatro)                        [«naranja»]

(3) split 50/50:
    MITAD       = SUBTOTAL_2 / 2

    rama directoras:
        base_dir      = MITAD − grabaciones_docentes               [monto fijo, editable, puede ser 0]
        por_directora = base_dir / n_directoras                    [n = 2 — Iris y Norma]

    rama empresa:
        ganancia_imedba  = MITAD × 80%
        acumulado_untref = MITAD × 20%
```

Identidad de control (debe cerrar siempre):
`SUBTOTAL_2 = Σ por_directora + grabaciones_docentes + ganancia_imedba + acumulado_untref`

Redondeo: `HALF_UP` a 2 decimales en cada paso. El residuo de `/2` y `/n_directoras` lo absorbe la **última directora**, para que la identidad cierre al centavo.

`acumulado_untref` **no se paga mensualmente**: se acumula (Nico 19:42) y se paga al cerrar la comisión. El pago del acumulado es §2 #5 (diferido); por ahora solo se registra y se muestra el acumulado.

Fuente textual (`liquidaciones-especificacion-20260724.docx`):
> *"A partir de lo cobrado descontamos el % de impuestos y gastos bancarios… es el primer descuento. Al subtotal (verde) se le descuentan los gastos administrativos (violeta): SECRETARIA, PUBLICIDAD, ADMINISTRACION, GASTOS VARIOS. Después de esa resta nos queda el subtotal 2 (naranja): se divide 50-50 y se realizan dos cálculos con cada mitad. La mitad de directoras se divide en 2 (Iris y Norma). Agregar en ese la opción de descontar por grabaciones docentes un monto fijo. De la otra mitad, el 80% queda como 'ganancia Imedba' y el otro 20% va para la cuenta acumulada de UNTREF."*

#### Delta contra `SettlementEngine.java` (lo que hoy está mal)

| # | Hoy | Debe ser | Impacto |
|---|---|---|---|
| 1 | `admin = remaining1 × admin_pct` | `administration_amount` **monto fijo** | Cambio semántico: % → monto |
| 2 | — | **GASTOS VARIOS** monto fijo (línea nueva) | Falta un descuento entero |
| 3 | Sin split 50/50 | `SUBTOTAL_2 / 2` | **Falta el corazón del cálculo** |
| 4 | — | `grabaciones_docentes` descontado **solo de la mitad de directoras** | Falta |
| 5 | `university = remaining1 × university_pct`<br>`imedba = remaining1 × imedba_pct` | `20% / 80%` **de la mitad no-directoras** | Base equivocada (remaining1 en vez de MITAD) |
| 6 | Socias reparten el remanente por `pct` configurado por socia | Directoras reparten **en partes iguales** la mitad menos grabaciones | Modelo equivocado |
| 7 | `diplomas` pide `% de la directora` al crear | Se saca; solo se elige **cuántas y quiénes** | `correcciones…docx`: *"al momento de crearla pide el % de la directora. Eso habría que sacarlo"* |

Es decir: el orden y las bases están mal desde el paso 3 en adelante. **Toda liquidación de diplomatura emitida hasta hoy con este motor está mal calculada** — hay que decidir si se recalculan las históricas (§7.4).

#### Migración

```
V038__diploma_settlement_v2.sql
  diplomas:
    − admin_pct, university_pct, imedba_pct, partners_config (JSONB con pct)
    + directors (FK M:N a academic_staff, o JSONB solo con ids/nombres — sin pct)
  diploma_settlements:
    + input_administration_amount   NUMERIC(12,2)   -- era input_admin_pct (%)
    + input_misc_expenses_amount    NUMERIC(12,2)   -- GASTOS VARIOS (nuevo)
    + input_recordings_amount       NUMERIC(12,2)   -- grabaciones docentes (nuevo)
    + input_imedba_pct DEFAULT 80, input_untref_pct DEFAULT 20   -- sobre la MITAD
    + subtotal_1, subtotal_2, half_amount           -- persistidos para auditoría
    + directors_base_amount, untref_accumulated_amount
```
Los campos viejos (`input_admin_pct`, `input_university_pct`) se conservan un ciclo para no romper las liquidaciones históricas, marcados `@Deprecated`, y se dropean en una migración posterior una vez decidido §7.4.

---

## 4. Personal Académico (nueva pestaña) — **en alcance**

Pedido explícito y chico. *docx: "Incluir una pestaña que sea DOCENTES y ahí cargar los datos de cada docente (mail, dni, materia que da y teléfono), de paso nos sirve para conectar con las distintas liquidaciones."*

En la llamada Nico lo generaliza (23:06): *"quizás se puede poner como **personal académico**… que vos puedas poner si es docente, si es tutora, si es preceptora y si es directora. Y si es de residencia, si es de prema o si es de ambas."*

⚠️ **Colisión de nombres:** el sidebar ya tiene `/personal` = administración de usuarios de Keycloak (solo admin). Esto es otra cosa. Va como **`/personal-academico`** bajo el grupo **Académico**, y el ítem existente se renombra a **"Usuarios"**. `[FRAN]` para el nav.

Es un CRUD sobre la tabla `staff` que **ya existe** (V013) — no se crea entidad nueva. Se extiende:

```
V037__academic_staff.sql
  staff:
    + dni            VARCHAR(20)
    + subject        VARCHAR(200)     -- materia/s que da
    + segment        VARCHAR(30)      -- RESIDENCIAS | FORMACION_SUPERIOR | AMBAS
    + paid_by_hours  BOOLEAN DEFAULT true   -- false = sueldo fijo, fuera de liquidación por horas
    + hourly_rate    NUMERIC(12,2)    -- override individual; si NULL usa el rate del tipo
    ck_staff_type → agregar 'DIRECTORA'
  activity_types:
    ck_activity_applies_to → agregar 'PRECEPTORA', 'DIRECTORA'
```

No es un padrón de inscripción — *"no es para inscribirlos en ningún lado"* (11:01). Es un listado de contacto que además alimenta las liquidaciones: las directoras de PREMA se cargan acá con rótulo `DIRECTORA` y se referencian desde la diplomatura (§3.3 #7), y los docentes/preceptoras desde la grilla de horas (§3.2).

---

## 5. Correcciones de Académico

| # | Item | Alcance | Notas |
|---|---|---|---|
| 5.1 | **Contrato no se descarga** | **Bug — prioridad alta** | *docx: "no me permite descargar contrato"*; Nico 32:19: *"no me decía nada"* (falla silenciosa). Lo venía haciendo Fran, que está de vacaciones ~3 semanas (32:36). Diagnosticar backend (generación del PDF, commit 7319d51/57844d4) antes de asumir que es frontend. |
| 5.2 | **Tildar contratos firmados** | Chico | `enrollments.contract_signed_at TIMESTAMPTZ` + checkbox + filtro "firmado / sin firmar" en el listado. `[FRAN]` la UI. |
| 5.3 | **Reordenar la diferenciación de cursos** | Mediano — cambio de funcionamiento existente, en alcance | Ver abajo. |
| 5.4 | **EXTRA LIBRO PREMA solo si unidad de negocio = Formación Superior** | Chico | *docx: "así no se mezcla, como cuando se abre el menú de comisión"*. Condicional en el form de inscripción. `[FRAN]` + validación en backend. |
| 5.5 | **Sacar `% de la directora` de la creación de diplomatura** | Chico | Parte de §3.3. |
| 5.6 | **Liquidaciones sin obligar a elegir diplomatura** | Chico | Entrada general con selector de tipo (§3). |

### 5.3 — Las 3 variables de curso

Hoy `courses` tiene un solo campo `modality VARCHAR(50)` que mezcla los dos ejes (valores actuales: `Tradicional, Intensivo, MIX, Super Intensivo`). Se separa en tres:

| Variable | Valores | Editable |
|---|---|---|
| **Nombre** | libre — depende del examen que rinden; se diferencia por fecha o región. Hoy: Tucumán, Córdoba, Uruguay, Junio/Julio | Sí |
| **Tipo de curso** | `NORMAL` (anual clásico, el default sin detalle), `INTENSIVO`, `CHOICE` | Preestablecido |
| **Modalidad** | `LIBRE`, `VIVO` | Preestablecido |

> *"El curso puede ser Tucumán libre intensivo, Córdoba vivo clásico… necesitaríamos que se puedan agrupar así. Quizás el nombre sea la variable editable y las preestablecidas modalidad y tipo de curso."*

Además existen **Reválida** y **Banco de preguntas** como productos aparte (el banco es universal hoy; segmentarlo por región es §2 #4, fuera).

```
V035__course_type_modality.sql
  courses:
    + course_type VARCHAR(20)   -- NORMAL | INTENSIVO | CHOICE
    modality: normalizar a LIBRE | VIVO
    backfill desde el `modality` actual (mapeo explícito, con reporte de los que no matchean)
    CHECK sobre ambos
```
Y filtros combinables por `name / course_type / modality / business_unit / country` en el listado y en el reporte de inscripciones — *"después de inscribir, filtrar dependiendo la necesidad y así poder agrupar para hacer análisis"*.

El backfill de `modality` necesita revisión manual de los datos reales antes de correr (`MIX` y `Super Intensivo` no mapean 1:1 a `{LIBRE, VIVO}`). Ver §7.5.

---

## 6. Plan de ejecución

Orden pensado para que lo verificable salga primero y lo bloqueado no frene al resto.

| Fase | Contenido | Depende de |
|---|---|---|
| **A** | 5.1 contrato (bug), 5.2 tildar firmados, 5.4 libro PREMA, 5.6 entrada general de liquidaciones | — |
| **B** | §4 Personal Académico (V037 + CRUD + UI) | — |
| **C** | §3.1 Comisiones vendedora: motor + tablas + tests contra la planilla de junio | B (vendedora sale de Keycloak, no de staff → en rigor no depende; se puede paralelizar con A) |
| **D** | §3.3 PREMA v2: V036 + reescritura de `SettlementEngine` + tests con caso real | B (directoras), §7.4 |
| **E** | §3.2 Docentes/preceptoras: extensión de `hour_logs` + grilla + mail | B, **§7.1 bloqueante** |
| **F** | 5.3 tipos y modalidad de curso + filtros | §7.5 |

**C** es el que más valor entrega por esfuerzo: la fórmula está verificada al centavo y todos los datos de entrada ya están en la base (`payments`, `book_sales`, `enrollments.enrolled_by`). No requiere que nadie cargue una grilla.

Testing (regla del repo: 80% mínimo). Para las tres liquidaciones, tests de caracterización con los números reales:
- Comisiones: junio-2026 completo → los 6 assertions de la tabla de §3.1 más el total exacto `186.793,50`.
- PREMA: pedir a Nico una liquidación real cerrada con todos los intermedios (§7.3).
- Docentes: pedir la hoja de horas (§7.1).

---

## 7. Preguntas bloqueantes para Nico

Ordenadas por impacto. La 7.1 frena la fase E.

**7.1 — Preceptoras, el 25% (BLOQUEANTE).**
Dijiste que se les paga por hora como a las docentes y se agrega 25% por cada clase, porque tienen que estar 15 min antes. ¿Cuál de las dos es?
- (a) **`total = (horas + 0,25 × cantidad_de_clases) × valor_hora_preceptora`** — se suma un cuarto de hora por clase. *(Es la que asumimos por default: 15 min = 0,25 h.)*
- (b) `total = horas × valor_hora_preceptora × 1,25` — se recarga el total un 25%.
Con clases de 2 h y 4 clases: (a) da 9 h pagadas, (b) da 10 h. **Y falta la hoja de horas docentes** — mandala, es la que valida esto.
Sub-pregunta: ¿el 25% aplica también a clases **asincrónicas** (donde no hay que llegar antes)?

**7.2 — Valor hora.** Docente = $75.000 (está en el docx). ¿Cuál es el **valor hora preceptora**? ¿Y el de tutora (Juana y Tere)? ¿Se cargan una vez y valen para todos, o cada una puede tener el suyo?

**7.3 — PREMA: una liquidación real.** Mandanos un mes cerrado con todos los intermedios (cobrado, % impuestos, los 4 gastos fijos, subtotal 1, subtotal 2, grabaciones, lo de cada directora, ganancia Imedba, acumulado UNTREF). Es para testear contra números reales, igual que hicimos con la de comisiones.

**7.4 — Liquidaciones de diplomatura ya emitidas.** El cálculo actual no coincide con lo que describiste (le falta el 50/50, GASTOS VARIOS y las grabaciones). ¿Recalculamos las que ya están cargadas en el sistema, o las dejamos como histórico y el criterio nuevo arranca desde la próxima?

**7.5 — Cursos existentes.** Al separar tipo y modalidad, ¿a qué corresponden los cursos ya cargados como **"MIX"** y **"Super Intensivo"**? No mapean a `{Normal, Intensivo, Choice} × {Libre, Vivo}`.

**7.6 — Comisiones, dos detalles finos.**
- Si en un mes hay más de 30 ventas: ¿la **venta número 30** paga 0,5% (primeras 30) — como asumimos — o 1%? El título de tu planilla dice *"del 30 al 49 (1%)"* pero el texto dice *"a partir de la 31"*. En junio hubo exactamente 30 y todas fueron 0,5%, así que no se distingue.
- Un libro **vendido junto con un curso** (la columna "Libros" de la planilla): en junio va al 0,5% igual que el curso, así que no se nota. Si el mes pasa de 30 ventas y el curso queda al 1%, ¿el libro incluido también va al 1%, o siempre 0,5%?

**7.7 — Diplomaturas y comisión de vendedora.** La venta de Diplomatura (fila de María Elena Brizuela, junio) cuenta para la comisión. Hoy las inscripciones a diplomatura no registran quién las vendió. ¿Las vende la misma vendedora? Si sí, hay que agregar el campo.

**7.8 — Liquidaciones en el menú.** Dijiste *"sacarlo de académico y bajarlo acá"* (25:07). Liquidaciones ya está en **Finanzas**. ¿A qué te referías — a **Diplomaturas**, que sí está en Finanzas y quizás va en Académico?

**7.10 — El libro PREMA (BLOQUEANTE para 5.4).** Pediste que *"el EXTRA LIBRO PREMA sólo aparezca si en unidad de negocio apretás Formación Superior"*. No se puede implementar sin dos datos:
- **Cuál es ese libro.** Hoy en el sistema hay 7 libros cargados y son todos de Residencias (Pediatría, Cirugía, Ginecología, Medicina Interna I y II, Medicina Familiar, Especialidades Quirúrgicas). El libro de PREMA no está cargado. ¿Cuál es, cuánto sale?
- **Los libros no tienen unidad de negocio en el sistema.** Para poder filtrarlos hay que agregarles el campo y marcar cada uno. ¿Los 7 actuales son todos de Residencias? ¿Hay alguno que se venda en las dos?

Y una tercera: cuando decís "unidad de negocio", ¿te referís al **selector de arriba a la derecha** (el que cambia entre Residencias y Formación Superior), o a la unidad **del curso que elegiste** en la inscripción? Son dos cosas distintas y el filtro queda diferente.

**7.9 — Recargo por mora y comisión.** Cuando un alumno paga una cuota con el 5% de recargo por atraso, ¿la comisión se calcula sobre el monto **con** recargo o **sin**? Asumimos **sin** (el recargo es una penalidad financiera, no valor de venta, y en tu planilla no aparece separado). Implementado así — se cambia en una línea si preferís lo otro.

---

## 8. Nota de propiedad

`[FRAN]` en este plan: nav del sidebar (§4), checkbox de contrato firmado (5.2), condicional del libro PREMA (5.4), form de curso con tipo+modalidad (5.3), pantalla de liquidaciones con selector de tipo (5.6) y las tres vistas de liquidación. El backend expone los endpoints y los `PageResponse<T>`; los `type` espejo en `frontend/src/types/` los agrega Fran (contrato front↔back, sin codegen).

---

## 9. Lo implementado — detalle técnico

### 9.1 Comisiones de vendedora (§3.1) — completo en backend

`V036__sales_commission.sql` + `modules/salescommission/`. Migración aplicada limpia sobre un Postgres 16 virgen corriendo V001→V036 en orden.

| Pieza | Archivo |
|---|---|
| Motor (función pura, sin Spring ni DB) | `salescommission/service/SalesCommissionEngine.java` |
| Servicio (junta datos + orquesta estados) | `salescommission/service/SalesCommissionService.java` |
| Queries sobre `payments` / `book_sales` / `enrollments` | `salescommission/repository/CommissionSourceRepository.java` |
| Entidades | `salescommission/entity/SalesCommissionSettlement.java`, `SalesCommissionLine.java` |
| API | `salescommission/controller/SalesCommissionController.java` |
| Tests | `test/.../salescommission/SalesCommissionEngineTests.java` — **14 tests, verdes** |

**Endpoints** (`sales_commissions:read` / `:write` — permisos nuevos, agregados a ADMIN, SECRETARIA_FS, CONTABLE y VIEWER en `keycloak/realms/imedba-realm.json` **y** en `keycloak/sync-roles.sh`, que es el que re-aplica en cada `up`):

```
GET  /api/v1/sales-commissions?sellerUserId=… | ?year=&month=
GET  /api/v1/sales-commissions/{id}
GET  /api/v1/sales-commissions/sellers?year=&month=     # [{id, name}] — quiénes vendieron en el período
GET  /api/v1/sales-commissions/preview?sellerUserId=&year=&month=[&tier1Rate=…]
POST /api/v1/sales-commissions                          # crea DRAFT
PUT  /api/v1/sales-commissions/{id}/recompute           # sólo en DRAFT
PUT  /api/v1/sales-commissions/{id}/approve
PUT  /api/v1/sales-commissions/{id}/mark-paid
```

`preview` calcula sin persistir: deja ver el número antes de crear el borrador. Es el endpoint que conviene cablear primero en la UI.

Decisiones que quedaron en el código y conviene no revertir sin leer esto:

1. **Un solo redondeo, al final** (`SalesCommissionEngine.compute`, `exactTotal`). Los buckets se redondean sólo para mostrar. Si alguien "arregla" esto sumando buckets redondeados, el test `redondeo_unico_al_final` se pone rojo y el total deja de matchear la planilla.
2. **Las ventas sin cobros del período igual se pasan al motor** con 0. No generan línea, pero ocupan lugar en el ranking de su mes y por lo tanto corren la alícuota de las que vienen después. Cubierto por `venta_sin_cobro_igual_rankea`.
3. **Lookback de 24 meses** (`COHORT_LOOKBACK_MONTHS`) para reconstruir el ranking de cohortes viejas que todavía cobran cuotas. Las ventas se financian hasta en 7 cuotas, así que sobra.
4. **Desempate del ranking por `sourceId`**, no sólo por fecha: dos ventas del mismo día tienen que caer siempre en el mismo orden entre corridas, o el recompute podría mover una venta del 0,5% al 1%.
5. **Sin `lateFeeAmount`** en la base de comisión (ver §7.9).
6. Los libros vendidos *dentro* de una inscripción no se tratan como `BOOK_SALE`: viajan en `enrollments.book_price` → `total_price` → los pagos de esa inscripción, así que ya quedan cubiertos por la línea del curso y con su alícuota. Es exactamente lo que hace la planilla (columna «Libros» sumada al «Precio final»). **El filtro `bs.enrollment IS NULL` de la query es obligatorio, no una optimización** — ver §9.5.

### 9.5 Dos bugs encontrados en autorevisión y corregidos

Ambos pasaban los tests originales: son de la capa de recolección de datos, no del motor.

**(a) Doble conteo de libros incluidos en una inscripción.** `BookSaleCreateRequest` acepta `enrollmentId` y `BookSaleService.create` lo persiste, así que sí pueden existir filas de `book_sales` con `enrollment_id` seteado. Como el libro incluido *también* viaja en `enrollments.book_price` → `total_price` → los pagos, la comisión se contaba dos veces: una por la línea del curso y otra como línea de libro. **Fix:** `AND bs.enrollment IS NULL` en `findBookSalesBySeller`. Escenario que fallaba: alumno con curso de $1.000.000 + libro de $300.000 cargado como `book_sale` linkeada → comisión sobre $1.300.000 (correcto) **más** $1.500 extra por la línea duplicada del libro.

**(b) Cobros descartados en silencio, y ranking corrompido.** Había un lookback fijo de 24 meses para reconstruir las cohortes viejas. `sumCollectedByEnrollment` devuelve los cobros de *cualquier* inscripción del período, pero sólo se armaba `Sale` para las que caían dentro de esa ventana → **el cobro de una inscripción más vieja desaparecía del cálculo sin ningún aviso** (la vendedora cobraba de menos). **Fix:** la ventana se deriva de los datos — `earliestSaleDateCollectingBetween` devuelve la fecha de venta más antigua entre las que cobraron en el período, y la ventana arranca en el **primer día de ese mes**.

Que arranque en el primer día del mes (y no en la fecha exacta de la venta) es la parte sutil: si al motor le llega una venta vieja **sin las demás de su mes**, la rankea 1ª y le aplica 0,5% cuando le correspondía 1%. Fijado por el test `mes_de_origen_incompleto_corrompe_el_ranking`, que primero demuestra el cálculo equivocado con el mes incompleto y después el correcto con el mes completo.

Constante `COHORT_LOOKBACK_MONTHS` eliminada — ya no hace falta elegir un número arbitrario.

**(c) El selector de vendedoras iba a mostrar UUIDs crudos.** `GET /sales-commissions/sellers` devolvía `List<UUID>` y la única forma de traducirlos a nombres era `GET /api/v1/users`, que está cerrado con `admin:manage` — o sea que **CONTABLE y SECRETARIA_FS, que son justamente quienes liquidan, no podían resolverlos**. **Fix:** el endpoint devuelve `[{id, name}]` y el nombre se resuelve en el backend con `KeycloakAdminClient.displayNamesById()`, un método nuevo que hace **una sola** llamada a Keycloak (a diferencia de `listUsers()`, que resuelve los roles de cada usuario con una llamada extra por cabeza). Degrada a `name: null` si la integración admin está apagada o Keycloak no responde — mostrar el id es peor que un nombre, pero mucho mejor que un 500. Se resolvió acá y no ampliando el permiso de `/api/v1/users`, para no abrir toda la administración de usuarios a quien sólo necesita liquidar.

**Revisado y sin cambios:** la carrera en `createDraft` (check-then-insert sobre el unique `(seller, year, month)`) degrada a un 409 limpio porque `GlobalExceptionHandler` ya mapea `DataIntegrityViolationException` → `409 DATA_INTEGRITY`. Y `preview` devuelve `id: null` en la liquidación y en las líneas porque la entidad es transitoria y nunca se persiste — esperado, pero el front no debe apoyarse en ese id.

### 9.2 Descarga de contrato (5.1) — root cause

**No existía el endpoint.** `ContractPdfRenderer` estaba implementado y con tests verdes, pero se usaba únicamente para adjuntar el PDF al mail de `CONTRACT` en `EnrollmentService.create`. No había ninguna ruta que devolviera el PDF, así que el botón del front no tenía contra qué pegar — de ahí que fallara sin mensaje (*"como que no me decía nada"*).

Agregado `GET /api/v1/enrollments/{id}/contract` → `application/pdf` con `Content-Disposition: attachment`. A diferencia del camino del mail (que degrada a mail sin adjunto para no bloquear el alta), acá el error se propaga a propósito: si el PDF no sale, la descarga debe fallar visible, no bajar un archivo vacío.

`[FRAN]` el botón tiene que apuntar a esa URL con el `Authorization: Bearer` puesto — un `<a href>` pelado va a dar 401.

### 9.3 Contratos firmados (5.2)

`enrollments.contract_signed_at` ya existía en la entidad (no hizo falta migración). Agregado:
- `PUT /api/v1/enrollments/{id}/contract-signed?signed=true|false` — endpoint propio en vez de pasar por `update`, así el checkbox no manda el payload completo ni dispara el recálculo de precios. Idempotente: volver a tildar no corre la fecha ya registrada.
- Filtro `GET /api/v1/enrollments?contractSigned=true|false` (`EnrollmentSpecs.byContractSigned`).

### 9.6 Personal Académico (§4) — completo en backend

`V037__academic_staff.sql`. **No se creó entidad nueva**: se extendió la tabla `staff` de V013, que ya modelaba docentes / tutoras / preceptoras.

| Cambio | Detalle |
|---|---|
| `staff.dni` | + unique index **parcial** `uk_staff_dni_active` (el soft delete no debe bloquear volver a dar de alta a alguien) |
| `staff.subject` | Materia/s. Texto libre a propósito: Nico quiere un dato de contacto, no un plan de estudios |
| `staff.segment` | `RESIDENCIAS` \| `FORMACION_SUPERIOR` \| `AMBAS`, nullable (filas viejas = sin especificar) |
| `staff.paid_by_hours` | `false` = sueldo fijo, fuera de la liquidación por horas. Cubre a la preceptora que ya cobra sueldo (llamada 13:22) |
| `staff.hourly_rate` | Override individual; `NULL` = usar el rate del `activity_type`. Deja funcionar cualquiera de las dos respuestas a §7.2 |
| `ck_staff_type` | + `DIRECTORA` |
| `ck_activity_applies_to` | + `PRECEPTORA`, `DIRECTORA` (antes sólo admitía `DOCENTE`/`TUTORA`/`ALL`, y las preceptoras tienen su propio valor hora) |

**Decisión de diseño que importa:** filtrar por `segment=RESIDENCIAS` o `=FORMACION_SUPERIOR` **incluye** a quienes están marcadas como `AMBAS` — si una docente da clases en las dos unidades tiene que aparecer al filtrar por cualquiera. Buscar explícitamente por `AMBAS` devuelve sólo esas. Está en `StaffSpecs.bySegment`.

Endpoints (`staff:read` / `staff:write`, ya existían):
```
GET /api/v1/staff?type=&segment=&paidByHours=&active=&q=    # q busca en nombre, apellido, mail, dni y materia
GET /api/v1/staff/by-type/{type}                            # activas de un rol, sin paginar — para selectores
```
`by-type/DIRECTORA` es el que va a alimentar el selector de directoras de la diplomatura cuando se saque el «% de directora» (5.5).

El chequeo de DNI duplicado está adelantado en el service para devolver *"Ya hay alguien cargado con el DNI 30111222: Norma Otra"* en vez del `DATA_INTEGRITY` crudo del índice.

⚠️ **Colisión de nombres pendiente `[FRAN]`:** el sidebar ya tiene `/personal` = usuarios de Keycloak (solo admin). Esto es otra cosa. Propuesta: el nuevo va como **`/personal-academico`** bajo **Académico**, y el ítem existente se renombra a **«Usuarios»**.

Verificado en Postgres real: `DIRECTORA` y los tres valores de `segment` aceptados, `paid_by_hours` default `true`, el unique de DNI rechaza el duplicado, y el soft delete libera el DNI para volver a usarlo.

### 9.7 Frontend (2026-07-30)

Implementado con autorización explícita de Santi durante la licencia de Fran. **Cero cambios en archivos de Fran que no tocaran estas features.**

| Pantalla | Archivos |
|---|---|
| Comisiones de vendedora | `components/SalesCommissionPanel.tsx`, `pages/SalesCommission.scss`, `api/sales-commissions.ts`, `types/sales-commission.ts` |
| Personal Académico | `pages/PersonalAcademico.tsx` + `.scss`, `components/StaffForm.tsx`, `api/staff.ts`, `types/staff.ts` |
| Contrato (descarga + firmado) | `api/client.ts` (`apiGetFile`/`saveFile`), `api/enrollments.ts`, `pages/Inscripciones.tsx` + `.scss`, `components/EnrollmentDetail.tsx` |
| Entrada general de liquidaciones | `pages/Liquidaciones.tsx` + `.scss` |
| Nav / rutas / permisos | `App.tsx`, `components/Sidebar.tsx`, `components/Topbar.tsx`, `lib/access.ts` |

**Decisiones que conviene no revertir:**

1. **`apiGetFile` va aparte de `apiGet`** en `client.ts`. No es sólo por los bytes: el endpoint del contrato **exige el header Authorization**, así que un `<a href>` pelado da 401. Se baja con fetch y se dispara con un object URL (que además se revoca, si no el blob queda retenido).
2. **El total de comisiones se muestra tal como viene del backend**, nunca sumando los buckets en el front. Está documentado en el `type`: sumar los 4 redondeados da 1 centavo de más y deja de coincidir con la planilla de Nico.
3. **La tabla de buckets replica las filas del Excel de Nico** a propósito — cursos tramo bajo / cursos tramo alto / libros / meses anteriores. Que se lea igual que su planilla es lo que le permite controlar el número de un vistazo. **Los buckets en cero se atenúan pero no se ocultan**: que el tramo del 1% haya dado cero es información.
4. **`/personal` renombrado a «Usuarios»** (ícono `UserCog`) y Personal Académico va en `/personal-academico` bajo **Académico**. Resuelve la colisión de nombres.
5. **El filtro de contrato firmado es server-side** (`?contractSigned=`), no un filtro sobre la página actual — si no, filtraría sólo los 10 registros visibles.
6. **`saleDate` se formatea parseando el string a mano.** `new Date('2026-06-03')` lo interpreta como UTC y en Argentina muestra el día anterior.
7. **La pestaña «Horas docentes» está visible pero deshabilitada**, con el motivo en el tooltip. Que el usuario vea que existe y por qué no está es mejor que esconderla.

**Verificación:** `tsc -b` limpio · `npm run build` OK (1844 módulos) · `npm run lint` **sin errores nuevos** — los 13 que reporta ya existían antes (verificado stasheando los cambios y re-corriendo: mismos 13). Los archivos nuevos pasan lint limpio.

**Sin probar contra el backend corriendo:** las pantallas compilan y tipan, pero no se hizo un smoke test end-to-end con el stack levantado. Queda pendiente.

### 9.8 PREMA v2 (§3.3 + 5.5) — completo, back + front

`V038__diploma_settlement_v2.sql`. Es el arreglo del cálculo que estaba mal.

**Cambio de modelo.** `diplomas` **dejó de tener costos y porcentajes** — se dropearon `tax_commission_pct`, `secretary_salary`, `advertising_amount`, `admin_pct`, `university_pct`, `imedba_pct` y `partners_config`. Todo eso se carga al liquidar. Lo único que queda en la diplomatura es **quiénes son las directoras**, vía la tabla nueva `diploma_directors` contra Personal Académico (staff con rol `DIRECTORA`).

**Los 6 errores del motor viejo, corregidos:**

| # | Antes | Ahora |
|---|---|---|
| 1 | Sin split 50/50 | `subtotal_2 / 2` — el corazón del cálculo |
| 2 | Sin GASTOS VARIOS | Cuarto gasto fijo |
| 3 | Sin grabaciones docentes | Se descuenta **sólo de la mitad de las directoras** |
| 4 | `admin` como % | Monto fijo |
| 5 | universidad/IMEDBA = % de `remaining1` | 20/80 **de la mitad** no-directoras |
| 6 | Socias con `pct` por cabeza | Directoras en **partes iguales** |

**Decisiones que conviene no revertir:**

1. **El residuo de las divisiones lo absorbe la última directora.** Con 3 y $100 sale 33,33 / 33,33 / 33,34. Si se prorrateara o se descartara, la identidad de control (`subtotal2 = Σ directoras + grabaciones + IMEDBA + UNTREF`) dejaría de cerrar. Hay un test que la verifica.
2. **Las grabaciones se topean a la mitad** y el subtotal 2 nunca baja de cero: un mes en rojo no genera repartos negativos.
3. **UNTREF no se asienta como egreso en Presupuesto** al marcar PAID. No se paga ese mes: se acumula hasta cerrar la comisión. Asentarlo ahí lo duplicaría cuando se implemente el pago del acumulado.
4. **`resolveDirectors` exige rol `DIRECTORA`.** Si alguien carga por error a una docente, el error salta al guardar la diplomatura y no tres pasos después como un reparto raro en la liquidación.
5. **El form valida que IMEDBA + UNTREF sume 100.** Si no, hay plata que no va a ningún lado y el usuario no se entera.

**Frontend:** `SettlementForm` reordenado en los 3 pasos de la fórmula; `SettlementDetail` muestra el cálculo paso por paso con los subtotales (se lee como la planilla); `DiplomaForm` reemplaza el editor libre de socias por un **selector de directoras de Personal Académico**, sin porcentaje; la columna «Reparto» de Diplomaturas se sacó porque ya no hay porcentajes en la diplomatura.

**Datos existentes:** las liquidaciones ya cargadas no se migran — se calcularon con la fórmula equivocada y sus importes no significan nada en el modelo nuevo. Quedan con los campos nuevos en 0 y hay que regenerarlas. Acordado con el cliente el 2026-07-30 (los datos se recargan de cero), que es lo que resolvió §7.4.

### 9.9 Respuestas de Nico (2026-07-30) — `V039`

Dos cambios de modelo que salieron de sus respuestas.

**(a) Tutora deja de ser un rol y pasa a ser una casilla.** *"Las tutoras son docentes que también hacen la parte de seguimiento […] se puede agregar una casilla para tildar TUTORA y listo."* Modelarla como `staff_type` era incorrecto: obligaba a elegir entre «docente» y «tutora» cuando es las dos. Ahora es `staff.is_tutor` y `StaffType` quedó en `{DOCENTE, PRECEPTORA, DIRECTORA}`. Las filas que estaban como `TUTORA` se migran a `DOCENTE` + `is_tutor = true`. El seguimiento en sí queda para más adelante (va con las alertas de pago, fuera de alcance).

**(b) Los libros pasan a tener unidad de negocio → cierra 5.4.** *"cuando matriculaba un alumno de Residencias me dejaba incluirle el libro de prema en la matrícula."* Sin este campo no había forma de filtrar. Se agregó `business_unit` a `books` y `collections`; los 7 libros y las 2 colecciones cargadas quedaron en `RESIDENCIAS` (confirmado por Nico).

**Decisión que conviene no revertir:** `business_unit = NULL` significa **«se vende en todas las unidades»**, no «en ninguna». Tanto `BookSpecs.availableIn` como el filtro del front incluyen los NULL. Si se invirtiera, cualquier libro cargado sin clasificar desaparecería del selector de la inscripción sin que nadie entienda por qué.

**El filtro toma la unidad del curso de la inscripción, no el selector del Topbar.** Lo que define qué libros corresponden es el producto que se está vendiendo, no en qué vista está parado el usuario. Y al cambiar de curso a otra unidad, lo ya elegido que quede fuera de catálogo **se limpia en el handler** (`pickCourse`), no en un `useEffect` — un efecto dispararía renders en cascada y reaccionaría a cualquier cambio del catálogo, no sólo a la acción del usuario. El lint lo marcó y tenía razón.

**Falta cargar el libro de PREMA.** No está en el sistema; cuando se cargue va como `FORMACION_SUPERIOR`. Nico aclaró que **viene incluido en la matrícula** de la diplomatura (no es opcional como los de Residencias) — si eso tiene que reflejarse en el precio automáticamente, es una decisión aparte.

**Sobre el menú (respuesta 5):** Nico quiere Diplomaturas como grupo en **Académico** y la liquidación de PREMA dentro de Liquidaciones en **Finanzas**. La segunda mitad ya está hecha (§9.7, selector de tipo). Mover Diplomaturas a Académico queda pendiente.

### 9.10 Liquidación de horas docentes (§3.2) — completa, back + front

`V040__class_sessions_teaching_settlement.sql` + `modules/teaching/` + dos pantallas.

**Tabla nueva, no `hour_logs`.** `hour_logs` es un agregado mensual (staff × actividad × mes) y la grilla real es **por clase**, con datos que ahí no existen: fecha, materia, comisión, sincrónica/asincrónica y —sobre todo— la preceptora, que **se asigna clase por clase y no coincide con la docente de esa fila**. `hour_logs` queda obsoleto; no se borró para no romper nada, pero ya no es el camino.

| Tabla | Qué es |
|---|---|
| `class_sessions` | La grilla que carga la secretaría (hoja HS DOCENTE) |
| `teaching_settlements` | Liquidación por persona + mes + rol |
| `teaching_settlement_lines` | Qué clases entraron, snapshoteadas |

**Decisiones que conviene no revertir:**

1. **`role` forma parte del unique** `(staff, año, mes, role)`. Una misma persona puede dar clases como docente y acompañar como preceptora en el mismo mes: son **dos liquidaciones**, con distinto valor hora y distinta fórmula. Con un unique sin `role` una de las dos se perdería.
2. **Una clase sin horas cargadas igual cuenta para el bonus de la preceptora.** Estuvo ahí y abrió la clase; sólo aporta 0 al total de horas. Si se filtraran las clases sin horas, la preceptora perdería esos 15 minutos.
3. **`actual_hours` es numérico, no texto.** En la planilla viene como `"2 h 50"`; el form pide **horas y minutos por separado** y arma el decimal. Pedir `2.83` a quien carga es una fuente de errores, y parsear el texto libre se rompe el día que alguien escriba `"2hs 50"`.
4. **Las asincrónicas se muestran atenuadas pero no se ocultan.** No entran en la liquidación, pero la secretaría igual las carga y las tiene que ver.
5. **Quien cobra sueldo fijo aparece en la lista de candidatas, deshabilitada y con el motivo.** Esconderla haría que el usuario no entienda por qué falta alguien que sí dio clases (caso Ailen).
6. **Las horas a pagar se editan inline en la grilla**, con las celdas tocadas resaltadas y un único botón de guardar. Es el cierre de mes: Cobranzas repasa toda la grilla de una, y abrir un modal por fila sería insufrible.

**Tests (12):** el central es `bonus_por_clase_no_porcentaje` — 4 clases de 2 h dan **9 h**, no 10, y hay un assert explícito de que el total **no** es el de la lectura equivocada. Está acompañado de `clases_de_una_hora_no_distinguen`, que documenta por qué un caso con clases de 1 h no habría alcanzado para detectar el error.

⚠️ **Agujero de permisos que encontré y arreglé:** `SECRETARIA_FS` no tenía `hour_logs:write` ni `staff:read` — o sea que **la secretaría no podía cargar la grilla**, que es literalmente su tarea. `SECRETARIA_RM` no tenía nada de esto y también carga clases (la grilla incluye «comunidad imedba», que es Residencias). Y `CONTABLE`, que liquida, no tenía `settlements:*`. Corregido en el realm JSON **y** en `sync-roles.sh`.

**Pendiente (diferido por Santi el 2026-07-30):** el mail que le pide la factura a la docente. El endpoint `invoice-sent` ya marca el envío, pero la plantilla no se escribió — *«se puede hacer después, total tampoco tenemos configurado lo del mail»*.

### 9.11 Cierre de las preguntas abiertas (2026-07-30)

Las 4 que quedaban se respondieron, y dos de las respuestas **destapaban gaps de UI**:

| Respuesta | Qué faltaba en el sistema |
|---|---|
| «El libro de PREMA **lo cargan ellos**» | El form de libros **no tenía el campo de unidad de negocio**. Lo habrían cargado sin unidad → en el modelo eso significa «se vende en todas» → el libro de PREMA habría seguido apareciendo al matricular en Residencias, que es justamente el bug que pidieron arreglar. Agregado. |
| «Poné 6500 y **que sea un campo editable**» | El endpoint `/api/v1/activity-types` existía desde V013 pero **no había ninguna UI**: no era editable por nadie. Modal nuevo desde Personal Académico con edición inline y guardado en lote. |
| «Las clases sin docente: **falta cargar el dato**» | La grilla ahora avisa con un banner cuántas clases en vivo no tienen docente y marca la celda en ámbar. Sin ese dato esa persona no entra en ninguna liquidación y no cobra. |
| «La plantilla del mail **se puede hacer después**» | Diferido. |

**Detalle que conviene no perder:** en el modal de valores hora, los conceptos que la liquidación busca **por nombre** (`Hora docente`, `Hora preceptora`) llevan una marca «usado por la liquidación». Renombrarlos desde la UI deja al motor sin tarifa y obliga a cargar el valor a mano en cada liquidación — es un acoplamiento por string y conviene que sea visible.

### 9.12 Tipos de curso y modalidad (5.3) — completo, back + front

`V041__course_type_and_modality.sql`.

**El problema real era peor de lo que decía el pedido.** `courses.modality` era `VARCHAR(50)` de texto libre y estaba cargando **tres conceptos distintos a la vez**:

| Lo que había en `modality` | Qué era en realidad |
|---|---|
| `LIBRE`, `VIVO` | modalidad (lo correcto) |
| `TRADICIONAL`, `INTENSIVO`, `SUPER_INTENSIVO`, `MIX_FEBRERO`, `PLUS` | tipo de curso |
| `Diplomatura Prematuros`, `Diplomatura Neurodesarrollo`, `Curso PAF` | el **producto** de Formación Superior |

Con los tres mezclados en una columna no había forma de agrupar por tipo ni por modalidad — que es exactamente lo que el cliente pidió poder hacer. El `DevDataSeeder` era una muestra del problema: guardaba `.modality("Diplomatura Neurodesarrollo")`, o sea el nombre del producto en el campo de modalidad.

**Los tres ejes ahora:**

| Eje | Valores | Editable |
|---|---|---|
| `name` | Tucumán, Córdoba, Uruguay, Junio/Julio… | Sí, libre |
| `course_type` | `NORMAL` (anual clásico) · `INTENSIVO` · `CHOICE` | Preestablecido |
| `modality` | `LIBRE` · `VIVO` | Preestablecido |

Reválida y «banco de preguntas» **no** son tipo ni modalidad: son productos aparte y se siguen distinguiendo por el nombre.

**Se eliminó la cascada modalidad↔unidad** que existía desde junio (FS ofrecía las diplomaturas como «modalidad»). Tipo y modalidad son ejes propios y valen para cualquier unidad; sólo la comisión sigue siendo exclusiva de FS.

**Migración de datos existentes:** se mapea únicamente lo que mapea sin ambigüedad —`TRADICIONAL→NORMAL`, `INTENSIVO→INTENSIVO`, y `LIBRE`/`VIVO` se preservan—. `SUPER_INTENSIVO`, `MIX_FEBRERO`, `PLUS` y los productos de FS quedan en NULL: no tienen equivalencia en la taxonomía nueva y el cliente confirmó que los cursos se recargan, así que no se inventa un mapeo que después haya que deshacer. **Verificado** simulando una base pre-V041 con los 6 valores viejos y corriendo la migración encima.

**Filtros combinables** en `GET /api/v1/courses?courseType=&modality=` y en la UI, que es el motivo del pedido (*«poder filtrar dependiendo la necesidad y así poder agrupar para análisis»*). Probado contra el stack: `?courseType=NORMAL&modality=VIVO` devuelve exactamente «Córdoba vivo clásico», el ejemplo textual de Nico.

### 9.13 Plantillas de pedido de factura (2026-07-31) — `V042`

Nico mandó los dos mails **tal como los escribe hoy a mano**. Quedaron cableados a las dos liquidaciones que los disparan, así que dejan de redactarse uno por uno.

| Mail | Asunto | A quién | Se dispara en |
|---|---|---|---|
| Honorarios docentes | `Imedba - Honorarios docentes` | docente / preceptora | `PUT /teaching/settlements/{id}/invoice-sent` |
| Formación Superior | `Imedba - Formación Superior Honorarios` | directoras de PREMA | `PUT /diploma-settlements/{id}/approve` |

**El de docentes lleva el detalle clase por clase**, que es la parte que Cobranzas armaba a mano copiando de la planilla. `describeLine` compone `Clase 7/5: Medicina Interna - CLIN 80 - Gastro - 2,5 hs` y omite las partes vacías (una clase sin comisión no deja un `-` colgando). Cierra con `Sincrónico {horas} horas: Total ${monto}` y los datos de facturación de IMEDBA (`DATOS_FACTURACION`: razón social, CUIT 30716062666, Rojas 61 - CABA, Responsable Inscripto, concepto).

**Formato de números en castellano**, no el `toString()` de `BigDecimal`: `4,5 horas` y `$337.500` — coma decimal, punto de miles, y sin decimales cuando son cero. Los meses se nombran en castellano (`finalizado el mes de junio de 2026`).

**El saludo va por nombre de pila.** El snapshot de la distribución guardaba `name` como `Alvarez, Iris` (formato de grilla) y el mail salía `Hola Alvarez, Iris`. Se agregó `firstName` al `DirectorDistribution` con `greetingName()`, que cae al nombre completo si el snapshot es viejo y no lo tiene. El DTO **no** expone el campo nuevo: los types del front no cambian.

`V042` agrega `TEACHING_INVOICE_REQUEST` al CHECK de `notifications.type` y `TEACHING_SETTLEMENT` al de `related_entity_type` — tipo propio para que la dedup de `NotificationService` no lo confunda con otra notificación de la misma entidad. El de directoras reusa `SETTLEMENT_APPROVED` (V019): cambió el texto, no el evento. Si la persona no tiene email cargado, la liquidación **igual** avanza de estado y queda un warning en el log: no se bloquea una liquidación correcta por un dato de contacto faltante.

**Verificado end-to-end contra el stack**, reproduciendo el mail real de Ana: dos clases de mayo (2,5 h + 2 h) → liquidación de 4,5 h × $75.000 = **$337.500**, y la fila en `notifications` sale con el asunto exacto y el cuerpo con las dos líneas de clase. El de PREMA sale con `El importe a facturar es de $1.315.205,14.-` sobre la corrida de junio. Además 12 tests de plantilla (`InvoiceRequestTemplateTests`) que fijan asuntos, formato de números, datos de facturación, firma y escapado de HTML en el nombre.

**Bug preexistente encontrado en el camino: `GET /notifications?type=X` ignoraba el filtro.** El `if/else` del controller cubría `status` y `status+type`, pero no `type` solo — esa combinación caía en el `findAll` y devolvía todo el historial. Salió a la luz porque filtré por tipo para verificar el mail y me vinieron notificaciones de otros tipos. Agregado `findAllByType` + la rama faltante, y `NotificationListFilterTests` fija las 4 combinaciones (el endpoint no tenía ningún test).

**Queda una duda menor para Nico:** en el mail original la línea de total dice `EVS Sincrónico 4,5 horas`. No pude determinar a qué refiere «EVS», así que la plantilla emite `Sincrónico 4,5 horas`. Si es una sigla que tiene que estar, es una línea de código.

### 9.14 Errores de cliente que salían como 500 (2026-07-31)

Salió del barrido final de endpoints, no de un pedido: **tres llamadas devolvían `500 «Error interno»` por equivocaciones del llamador**, y el mensaje que explicaba qué mandar nunca llegaba.

| Llamada | Antes | Ahora |
|---|---|---|
| `GET /teaching/settlements` sin filtros | 500 «Error interno» | 400 `Indicá staffId, o year + month` |
| `GET /sales-commissions` sin filtros | 500 «Error interno» | 400 `Indicá sellerUserId, o year + month` |
| `POST` de venta con `qty <= 0` | 500 (y el mensaje en inglés, `qty must be > 0`) | 400 `La cantidad a descontar del stock debe ser mayor a 0` |
| Cualquier path inexistente | 500 «Error interno» | 404 `Recurso no encontrado: <path>` |

**Causa:** los dos primeros son míos — lanzaba `IllegalArgumentException` pelada, que el `GlobalExceptionHandler` no mapea, así que caía en el catch-all. El tercero ya estaba. El de path inexistente es `NoResourceFoundException`, que tampoco estaba mapeada: **una URL mal escrita del front se veía como servidor roto**.

**Por qué no se mapea `IllegalArgumentException` en bloque:** la tiran también los `valueOf` de enums y los parsers internos. Un 400 con el mensaje crudo de esos casos filtraría detalle interno. Se agregó `BadRequestException` siguiendo el patrón que el repo ya tenía con `NotFoundException`/`ConflictException`, y su handler.

Un test existente (`BookServiceTests.reserve_stock_non_positive_rejected`) fijaba el tipo viejo, o sea **fijaba el bug**: actualizado para exigir 400. Más `GlobalExceptionHandlerTests` con los dos mapeos nuevos.

### 9.4 Verificación

- **Unit tests: 118/118 verdes** (`./mvnw test`, excluyendo integración) — 15 del motor de comisiones, 19 del motor PREMA (5 contra la planilla real), 12 del motor de horas docentes, 12 de las plantillas de mail, 4 del filtro de notificaciones, 2 del handler de errores y 5 de Personal Académico.
- `ImedbaApplicationTests` y los `*ApiIntegrationTests` no corren en este entorno: necesitan Testcontainers y Maven corre dentro de un contenedor sin socket Docker (limitación conocida, ya registrada en el DIARIO el 2026-04-20). **Los tests de integración del módulo nuevo quedan pendientes** de correrse con Java 21 en el host.
- Migraciones validadas aplicando **V001→V042** en orden sobre un Postgres 16 limpio, más inserts de humo que confirman defaults (`0.005 / 0.010 / 0.005 / 30` en comisiones; `paid_by_hours=true` en staff), CHECKs, uniques (`(seller, year, month)` y `uk_staff_dni_active`) y el trigger `set_updated_at`.
- El host tiene Java 17 y el proyecto pide 21: correr con
  `MSYS_NO_PATHCONV=1 docker run --rm -v "/c/…/backend:/work" -v "/c/Users/<user>/.m2:/root/.m2" -w /work eclipse-temurin:21-jdk ./mvnw test`
