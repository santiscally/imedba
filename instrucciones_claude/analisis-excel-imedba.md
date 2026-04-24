# Análisis del Excel - Archivos Varios IMEDBA

> Documento de análisis de las 8 hojas del Excel operativo actual, con mapeo a las entidades del sistema a desarrollar.

---

## Resumen de hojas

| Hoja | Qué es | Entidad(es) del sistema |
|------|--------|------------------------|
| `Presupuesto` | Plantilla anual de ingresos vs egresos por unidad de negocio | `budget_entries` |
| `caja efectivo` | Movimientos de caja en efectivo | `budget_entries` (flag `is_cash = true`) |
| `Plantilla de pagos` | Pagos mensuales a empleados, docentes, proveedores | `hour_logs`, `contacts`, `staff` |
| `Editorial` | Ventas de libros por tipo y mes, costos de producción | `books`, `book_sales`, `book_authors` |
| `Horas docente` | Registro mensual de horas por docente y tipo de actividad | `hour_logs`, `activity_types` |
| `hoja de deudores y mails alumno` | Alumnos con cuotas pendientes y estado de recargos | `installments`, `enrollments` |
| `excel datos alumnos` | Formulario de inscripción de alumnos | `students`, `enrollments` |
| `ventas` | Registro de ventas realizadas por vendedora | `enrollments`, `payments` |
| `precio de lista` | Tabla de precios por curso, modalidad y plan de pago | `courses`, `discount_campaigns` |
| `liquidacion formacion superior` | Liquidación mensual de diplomaturas con distribución | `diploma_settlements`, `diploma_enrollments` |

---

## Hoja 1: `Presupuesto`

### Qué hace
Plantilla anual con columnas Proyectado / Real para cada mes. Estructura de dos partes:
- **Ingresos**: por unidad de negocio (Residencias, Editorial, Prematuros, Otros cursos, Otros)
- **Egresos**: por categoría (Sueldos, Honorarios, Docentes, Publicidad, Servicios, Costos, Abonos, Gastos, Impuestos, Banco)

### Datos concretos extraídos

**Unidades de negocio (ingresos):**
- Residencias: Matrícula + Ingresos para cada modalidad → Curso Libre, Curso Vivo, Córdoba, Esencial, Uruguay, Solo Choice Online, Solo Choice Vivo, Intensivo, Pregrado, Banco Audiovisual, Reválida, Otros Ingresos
- Editorial: Venta Libros RM, Libros PREMA, Libros Otros
- Prematuros: Matrícula + Curso Prema
- Otros cursos: Matrícula + Curso Circo + Curso PF
- Otros: Ingresos varios, Costos de envíos, Plazos fijos, Correo DHL

**Categorías de egresos con subcategorías reales:**

| Categoría | Subcategorías |
|-----------|---------------|
| Sueldos | Dirección General (JAQUI), Coordinación presencial/web (MELI), Coordinación Audiovisual (GUSTAVO), Sueldo FEDE OVIEDO, Sueldo CAROLINA, Sueldo PAULA ERLICH |
| Honorarios | Esteban, Adm contable Nico, Asistente AV Fede Quintana, Fourteam - David Silva, Vendedora, Programadores - Plataforma, Contador, Consultoría, Estudios jurídicos |
| Docentes | Clases OL Sincrónicas, Tutoras Uruguay, Tutoría Mariana, Tutoría Ana, Tutorías GIN/CIR/MF, Preceptoría Julieta-Teresa, Tutores Formación superior, Docentes prema, Docentes Circo y PAF, Capacitaciones |
| Publicidad | Meta-Google, Promotores (Jorge), Impresión gráfica mkt, Revistas difusión, Redes |
| Servicios | Alquiler, Expensas, Agua, Internet, Celulares, Luz, Gas |
| Costos | Insumos fotocopiadora, Equipamiento filmación/compus, Equipamiento oficina, Libros Bibliografía, Libros Impresión, Libros Registro, Libros Bolsas, Libros Autoría, Libros Ilustraciones, Libros Corrección/Revisión, Libros Edición (Virginia) |
| Abonos | Agora, Adobe, AVG, Claude, Dropbox, DNDA, Dominios, Envialo simple DON WEB, Calendli, Genially, Google, Hosting, LinkedIn, Microsoft/OneDrive, Mobirise-Verifone, NIC, Sorteos, Padlet, Payway, Publical Editorial, Tienda Nube, Verisure Alarma, Vimeo, Zoom |
| Gastos | Service Computadora, Service Fotocopiadora, Mantenimiento, Service Aire, Gastos de oficina, Servicio doméstico Marta, Correo interno (Cabify), Andreani, Seguros-Segurcop, Almacén, Capacitación, Viáticos, Otros gastos, Viajes |
| Impuestos | IVA, Ingresos Brutos, Cargas Sociales, Sindicato, Autónomos, Imp. a las Ganancias, SICOBE, Impuesto país, Moratorias/planes de pago, ART |
| Banco | Plazos Fijos, Comisiones bancarias, IIBB Bancario, SIRCREB Bancario, Imp Ley 25413, Caja de seguridad, Tienda Nube (ret+cuota simple), Tienda Nube (impuestos), Payway (retenciones), Payway (impuestos), Paypal-Prex, Cuotas préstamos |

### Mapeo al sistema

```
budget_entries:
  entry_type = INCOME | EXPENSE
  business_unit = RESIDENCIAS | EDITORIAL | PREMATUROS | FORMACION_SUPERIOR | GENERAL
  category = SUELDOS | HONORARIOS | DOCENTES | PUBLICIDAD | SERVICIOS |
             COSTOS | ABONOS | GASTOS | IMPUESTOS | BANCO
  subcategory = VARCHAR  ← los ítems detallados arriba
  is_projected = true/false
  is_recurring = true  ← para Abonos y Servicios
  period_month, period_year
```

**⚠️ Observación importante**: Los "Abonos" son un tipo de egreso recurrente (suscripciones). En el DDL actual están mezclados con gastos variables bajo la misma tabla. Esto es correcto, pero el campo `is_recurring = true` es clave para filtrarlos.

---

## Hoja 2: `caja efectivo`

### Qué hace
Registro de movimientos de efectivo, con entradas y salidas por mes. Columna "saldo" al inicio de cada mes.

### Estructura de columnas
```
fecha | concepto | gastado_por | entrada | salida
```
Meses como bloques horizontales (enero a diciembre), con saldo calculado al inicio de cada bloque.

### Mapeo al sistema
```
budget_entries:
  is_cash = true
  entry_type = INCOME (entrada) | EXPENSE (salida)
  registered_by → FK a usuario
```

**Nota**: La hoja tiene una descripción textual en la primera celda: *"este archivo es del area contable, tenemos el control de los ingresos y egresos específicos en efectivo"*. Confirma que es un sub-registro del presupuesto general, solo para efectivo.

---

## Hoja 3: `Plantilla de pagos`

### Qué hace
Planilla mensual de pagos con 4 secciones: Empleados, Proveedores, Docentes RMA, y Gastos Fijos.

### Sección Empleados
Columnas: `BANCO | ADELANTOS/VACACIONES | RETIROS SOCIOS | efectivo | TOTAL | INVERSIONES SOCIOS`

Personas: Jaqui, Gus, Meli, Fede, Caro, Paula, Vendedora (+ SAC de cada una)

### Sección Proveedores
Columnas: `Monto | Bono-Extra | MAIL | FACTURA | PAGADO | ARCHIVADO`

Personas: Fede Quintana, Nico, Esteban, Mariano, David, Emilia VENDEDORA, Jorge carteles

### Sección Docentes RMA
Columnas: `HORAS | MONTO TOTAL | MAIL | FACTURA | PAGADO | ARCHIVADO`

- Valor hora: $100 (en el Excel de ejemplo, la real es $75.000 según hoja "Horas docente")
- Lista de docentes con horas y montos calculados
- Preceptoras con cálculo especial (Aylen: 19hs - 8 clases = $168.000)

### Sección Gastos Fijos
Impuestos (con fecha VEP), Servicios (con monto y estado), Gastos Variables

### Mapeo al sistema

```
staff (docentes + tutoras):
  first_name, last_name, staff_type = DOCENTE | TUTORA | PRECEPTORA

hour_logs:
  staff_id → FK staff
  hours, rate_per_hour, total_amount
  invoice_email_sent_at → columna MAIL
  invoice_received → columna FACTURA
  payment_status → PAGADO

contacts (empleados + proveedores):
  contact_type = EMPLEADO | PROVEEDOR
  columns de seguimiento: MAIL, FACTURA, PAGADO, ARCHIVADO
  → en el sistema se modelan como flags en budget_entries o en contacts
```

**⚠️ Dato nuevo**: La columna `RETIROS SOCIOS` e `INVERSIONES SOCIOS` aparece en la sección de empleados. Esto representa que las socias (Jaqui y otras) tienen una modalidad de "retiro" además del sueldo. **No está modelado en el sistema actual**. Evaluar si agregar campo `is_partner_withdrawal` en `budget_entries` o un tipo de contacto `SOCIA`.

---

## Hoja 4: `Editorial`

### Qué hace
Reporte de ventas de libros por tipo (binder/anillado), destinatario (alumnos/venta editorial), año y mes. Incluye cálculo de costos de producción e ingresos.

### Libros existentes (con códigos y cantidades de impresión 2025)
| Código | Nombre | Binder (qty) | Anillado (qty) | Precio Binder | Precio Anillado |
|--------|--------|-------------|---------------|---------------|-----------------|
| PED | Pediatría | 233 | 52 | $14.845/u | $18.749/u |
| CIR | Cirugía | 233 | 52 | $11.349/u | $14.432/u |
| GIN | Ginecología | 233 | 52 | $11.149/u | $14.554/u |
| MI 1 | Medicina Interna 1 | 233 | 52 | $12.273/u | $15.648/u |
| MI 2 | Medicina Interna 2 | 233 | 52 | $12.920/u | $16.499/u |
| MF | Medicina Familiar | 233 | 52 | $12.695/u | $16.134/u |
| QX | Quirúrgicas | 233 | 52 | $11.981/u | $15.283/u |

- Precio colección completa binder: $470.610
- Precio colección completa anillado: $533.610
- Precio para alumnos (-35%): Binder $305.897 / Anillado $346.847

### Costos de producción (edición PED, datos reales)
- Corrección y revisión (Jaqui): $12.834.075
- Edición (Fede Pumar): $5.000.000
- Publicidad: $301.123,96
- Comisión bancaria: $3.359.692,26
- Autorías 2025: $2.950.000

### Mapeo al sistema

```
books:
  code = PED | CIR | GIN | MI1 | MI2 | MF | QX
  format = BINDER | ANILLADO   ← campo VARCHAR, no tabla
  sale_price = precio de venta
  student_discount_pct = 35   ← OJO: el Excel dice 35%, el DDL dice 30%
  stock_quantity (impresión 300 libros por título)

book_sales:
  is_student_sale = true/false
  quantity, unit_price, total_amount
  sale_date

book_authors (autorías):
  royalty_percentage → calculado sobre ventas
  total autorías 2025: $2.950.000
```

**⚠️ Discrepancia encontrada**: El DDL en `02-entidad-relacion.md` dice `student_discount_pct = 30`, pero el Excel muestra descuento del **35%** para alumnos (precio colección $470.610 → precio alumnos $305.897 = 35% descuento). **Confirmar con el cliente cuál es el porcentaje correcto.**

---

## Hoja 5: `Horas docente`

### Qué hace
Registro mensual de horas por docente, con columnas por tipo de actividad.

### Valores hora
- **Hora Argentina**: $75.000
- **Hora Preceptora**: $8.000

### Tipos de actividad
| Código | Nombre | Aplica a |
|--------|--------|----------|
| CLASES | Clases sincrónicas | RMA (Residencias) |
| EVS VIVO | Evaluaciones en vivo | RMA |
| EVS GRABADO | Evaluaciones grabadas | RMA |
| EVS VIVO | Evaluaciones en vivo | RMU (Uruguay) |
| CLASES | Clases | Preceptoras |
| APERTURAS | Aperturas | Preceptoras |

### Docentes registrados (muestra)
Lavitola Mariana, Passarelli Melina, Girola Pablo, Veiga Sabrina, Panizza Ana, Alonso Mariela, Ramírez Julián, Granada Agustina

Preceptoras: Aylen (19hs regulares + 8 clases = $168.000), Bianca, Teresa

### Flujo de factura
Columnas por docente: `Enviado | Factura recibida | Pagado` (con fechas numéricas Excel = timestamps)

### Mapeo al sistema

```
activity_types:
  name = CLASES | EVS_VIVO | EVS_GRABADO | APERTURAS
  rate_per_hour = 75000 (Argentina) | 8000 (Preceptora)
  applies_to = DOCENTE | PRECEPTORA | ALL

hour_logs:
  staff_id → FK staff
  activity_type → VARCHAR referencia a activity_types
  hours, rate_per_hour, total_amount
  invoice_email_sent_at → columna "Enviado"
  invoice_received → columna "Factura recibida"
  paid_at → columna "Pagado"
```

**⚠️ Dato nuevo**: Las fechas en las columnas `Enviado`, `Factura recibida`, `Pagado` son **fechas reales de Excel** (números seriales como 45751, 45754, etc.), no solo flags booleanos. El sistema ya modela esto con `invoice_email_sent_at TIMESTAMP` y `paid_at TIMESTAMP`, lo cual es correcto. ✅

---

## Hoja 6: `hoja de deudores y mails alumno`

### Qué hace
Control de alumnos con cuotas pendientes, estado de envío de mails de advertencia y cálculo de recargos.

### Estructura
```
Curso | DETALLE | Nombres | Apellidos | Mail | Celular |
cuota1 | cuota2 | cuota3 | Pago con recargo | Cuota simple | Recargo % | Importe recargo | Factura | LOCALIDAD | OBSERV
```

### Datos concretos
- Cursos: RMA, PREMA, REVÁLIDA
- Recargo fijo: **5%** (columna `Recargo %` = 1.05 en todos)
- Ejemplos de montos:
  - Cuota simple: $401.966 → con recargo: $422.064,30 (diferencia: $20.098,30 = 5%)
  - Cuota simple: $209.218 → con recargo: $219.678,90
- Las columnas 1, 2, 3 son checkboxes (x) indicando qué cuotas están impagas
- La columna `Factura` parece indicar si se requiere factura del alumno

### Datos con información relevante en OBSERV
- "grupo 2 (20-30)" → indica grupo/modalidad
- "link enviado" → enviaron WhatsApp
- "paga en estos dias" → observación manual
- "paga a fin de mes los dos meses pendientes" → estado negociado

### Mapeo al sistema

```
installments:
  status = PENDING | OVERDUE
  surcharge_amount → 5% calculado automáticamente
  due_date, paid_at

notifications:
  category = PAYMENT_DUE | SURCHARGE
  related_entity = installment
  status = SENT
```

**Confirmación de regla de negocio**: El recargo es **exactamente 5%** sobre la cuota base, consistente con `03-reglas-negocio-pendientes.md`. ✅

---

## Hoja 7: `excel datos alumnos`

### Qué hace
Datos de alumnos provenientes de un formulario Google. La hoja incluye nota: *"la idea es tener esto + datos para agregar de la vendedora en cuanto a la forma de pago, cuotas y lo demás"*.

### Columnas del formulario Google
```
Fecha | Nombres | Apellidos | Nacionalidad | Universidad | DNI |
Correo electrónico | Celular (whatsapp) | Curso | Modalidad | COMENTARIOS
```

### Columnas agregadas manualmente por la vendedora
```
Pago chq | matriculados | Libros | CONT ENVIADO | CONT FIRMADO |
Observaciones | Entrevista | Ausente plat NOV | Ausente plat ENE
```

### Modalidades de curso observadas
- Tradicional
- Intensivo FEB
- MIX febrero
- Super Intensivo
- (vacío = a definir)

### Cursos observados
- RRA LIBRE, VIVO P Agosto, LIBRE P Agosto, RRA LIBRE, VIVO Super Intensivo

### Mapeo al sistema

```
students:
  first_name, last_name → "Nombres", "Apellidos"
  nationality → "Nacionalidad"
  university → "Universidad"
  dni → "DNI"
  email → "Correo electrónico"
  phone → "Celular (whatsapp)"

enrollments:
  course_id → "Curso"
  modality → en courses.modality
  contract_sent_at → "CONT ENVIADO"
  contract_signed_at → "CONT FIRMADO"
  notes → "COMENTARIOS" + "Observaciones"
  enrollment_date → "Fecha"
```

**⚠️ Columnas sin mapeo actual**:
- `Pago chq` → podría ser `payment_method = CHEQUE` (no está en el enum del DDL)
- `Entrevista` → estado de entrevista previa a la inscripción. **No está modelado**. ¿Agregar campo `interview_status` en `enrollments`?
- `Ausente plat NOV`, `Ausente plat ENE` → ausencias en plataforma. Probablemente es algo que maneja Moodle. **No modelar en esta etapa**.

---

## Hoja 8: `ventas`

### Qué hace
Registro de ventas con datos completos del alumno, producto, precios, descuentos y forma de pago.

### Columnas
```
Fecha | Nombre | Apellido | Mail | Teléfono | Producto |
Precio de lista | Descuento | Precio con descuento | Libros |
Precio final | Medio de pago | Observaciones
```

### Datos de muestra (reales, anonimizados aquí)
| Producto | Precio lista | Descuento | Precio final | Libros | Total | Pago |
|---------|-------------|-----------|-------------|--------|-------|------|
| Curso Intensivo Libre TUCUMÁN 2026 | $708.000 | 25% (Fiestas) | $531.000 | NO | $531.000 | 2 cuotas x $265.500 |
| Curso Intensivo Libre 2026 | $1.020.000 | 25% (black) | $765.000 | NO | $765.000 | 3 cuotas x $255.000 |
| Curso Córdoba Libre 2026 | $812.500 | 25% (Fiestas) | $609.375 | $305.897 | $915.272 | 3 cuotas x $305.090 |
| Curso Intensivo Libre 2026 | $1.020.000 | 30% (black+grupo) | $714.000 | $305.897 | $1.019.897 | 3 cuotas x $339.966 |

### Tipos de descuento observados
- `25% (Fiestas)` → campaña estacional
- `25% (black)` → campaña Black Friday
- `30% (black+grupo)` → campaña combinada

### Mapeo al sistema

```
discount_campaigns:
  name = "Fiestas 2025", "Black Friday 2025", etc.
  discount_type = PERCENTAGE
  discount_value = 25 | 30

enrollments:
  list_price → "Precio de lista"
  discount_percentage → "Descuento"
  final_price → "Precio con descuento"
  book_price → "Libros"
  total_price → "Precio final"
  num_installments → extraído de "Medio de pago" (texto libre actualmente)
  payment_method → "transferencia" en todos los casos observados
```

**⚠️ Problema de datos**: El campo "Medio de pago" es texto libre actualmente (ej: *"2 cuotas por transferencia de $ 265.500"*). En el sistema esto se divide en campos estructurados: `num_installments` + `payment_method`. La migración/importación necesita parsear este campo. Tener en cuenta para el importador de datos.

---

## Hoja 9: `precio de lista`

### Qué hace
Tabla de precios completa por producto (curso), modalidad de pago y opción de libros.

### Cursos listados
1. Curso Intensivo Libre
2. Curso Intensivo Vivo
3. Curso Sólo Choice Tucumán
4. Curso Intensivo Tucumán
5. Curso Sólo Choice Córdoba
6. Curso Intensivo Córdoba
7. Curso Sólo Choice Abril-Mayo
8. Curso Intensivo Abril-Mayo
9. Curso Solo Choice Plus Libre
10. Curso Solo Choice Plus Vivo
11. Curso Plus 2027 Libre
12. Curso Plus 2027 Vivo
13. Curso Reválida

### Estructura de precios por curso
Cada curso tiene:
- `Matrícula`
- `Curso` (precio base)
- `Precio de lista solo curso` = Matrícula + Curso
- `Precio de lista curso con libros comunes`
- `Precio de lista curso con libros anillados`

### Planes de pago
- 1 pago con **10% de descuento** por transferencia
- 2 cuotas sin interés por transferencia
- 3 cuotas sin interés por transferencia
- 6 cuotas sin interés (solo para cursos Plus 2027)

Nota: Para cursos Sólo Choice Abril-Mayo e Intensivo Abril-Mayo, los planes de 2 y 3 cuotas aparecen como "No aplica".

### Precios de libros individuales (2025)
| Libro | 3ra Edición | Tradicional | Anillado |
|-------|-------------|-------------|----------|
| Pediatría | $53.400 | $72.090 | $81.090 |
| Cirugía | $49.200 | $66.420 | $75.420 |
| Ginecología | $49.200 | $66.420 | $75.420 |
| Medicina Interna 1 | $49.200 | $66.420 | $75.420 |
| Medicina Interna 2 | $49.200 | $66.420 | $75.420 |
| Med. Familiar | $49.200 | $66.420 | $75.420 |
| Quirúrgicas | $49.200 | $66.420 | $75.420 |
| Niños Nacidos Prematuros | — | $50.160 | — |
| Prescripción Física | — | $29.880 | — |
| Guía Tabaco | — | $29.880 | — |

### Mapeo al sistema

```
courses:
  name → nombre del curso
  enrollment_price → "Matrícula"
  course_price → "Curso"
  modality → LIBRE | VIVO | SOLO_CHOICE | INTENSIVO | PLUS | REVALIDA
  exam_date → "Fecha de examen"

discount_campaigns:
  name = "10% pago único transferencia"
  discount_type = PERCENTAGE
  discount_value = 10
  → aplica cuando num_installments = 1 y payment_method = TRANSFERENCIA
```

**⚠️ Observación**: El descuento del 10% por pago único es **sistémico** (aplica a todos los cursos), no una campaña temporal. Podría modelarse como una `discount_campaign` permanente o como lógica en el motor de cuotas. **A decidir con el cliente**.

---

## Hoja 10: `liquidacion formacion superior`

### Qué hace
Liquidación mensual de diplomaturas con distribución jerárquica de fondos y seguimiento de cuotas por alumno.

### Distribución observada (datos reales)

| Concepto | % / Monto | Sobre qué base |
|---------|-----------|---------------|
| Impuestos y comisiones bancarias | **25,1%** | Sobre total cobrado |
| Sueldo secretaria | **$1.000.000/mes** (o $500.000 por cuota) | Fijo |
| Publicidad | **$522.000/mes** (o $261.000 por cuota) | Fijo |
| Administración | **$805.600/mes** (o $402.800 por cuota) | Fijo |
| UNTREF | **20%** | Sobre subtotal después de deducciones |
| IMEDBA | ~**40%** | Sobre subtotal después de UNTREF |
| Directoras/Socias | ~**25%** | Remanente dividido entre socias |

**Flujo real observado:**
```
Total cobrado (ej: $4.746.475)
- Impuestos 25,1% = $1.191.365
= Subtotal $3.555.109
- Secretaria $1.000.000
- Publicidad $522.000
- Admin $805.600
= Subtotal distribuible $1.227.509
  - IMEDBA $491.003
  - Directoras (socias) $613.754
    - Distribución directoras (50%): $306.877
    - UNTREF 20%: $122.750
```

### Diplomaturas observadas
- C9 (nombre no indicado en el Excel)
- C10 (nombre no indicado en el Excel)

### Alumnos en C9
Espinoza Salazar, Bustamante Cyntia, Vargas Margarita Zoe, Alegre Patricia Beatriz, Quevedo Melina, Gout Yanina, Elena Soledad Vadela T, Mazurier Valeria

### Alumnos en C10
Ana Liss Vergez, Maria Silvina Camardell, Takata Eugenia Miyuki, Bayarsky Brenda, Torrego Ana Cecilia, Romero Gianotti Maria, Montivero Agustina, Valdivia Ortega Sadiq Zenon, Decena Rocio

### Cuotas observadas
- C9: $124.000, $124.800, $156.000 por cuota mensual
- C10: $121.875, $138.125, $162.500, $170.625 por cuota mensual

### Mapeo al sistema

```
diploma_settlements:
  total_collected → "Cobrado"
  tax_commission_amount → 25,1% del total
  secretary_amount → $500.000 por cuota (mensual = $1.000.000)
  advertising_amount → $261.000 por cuota
  admin_amount → $402.800 por cuota
  university_amount → 20% del subtotal
  imedba_amount → ~40% del subtotal
  partners_distribution JSONB → distribución entre socias/directoras

diploma_enrollments:
  student_id → FK students
  diploma_id → C9, C10
  pending_amount → "Pendiente de cobro"
  cuotas mensuales → installments
```

**✅ Confirmación de porcentajes**: El Excel confirma `tax_commission_pct = 25.1`, `university_pct = 20%`, `secretary_salary = $1.000.000/mes` (resuelve pregunta 🔴 2.2 de `03-reglas-negocio-pendientes.md`).

---

## Resumen de hallazgos y acciones recomendadas

### ✅ Datos confirmados para el sistema
1. Recargo de cuotas: **5%** exacto
2. Impuestos liquidación diplomas: **25,1%**
3. Universidad (UNTREF): **20%**
4. Sueldo secretaria diploma: **$1.000.000/mes**
5. Publicidad diploma: **$522.000/mes**
6. Administración diploma: **$805.600/mes**
7. Valor hora docente: **$75.000** | Preceptora: **$8.000**
8. Libros: 7 títulos con códigos PED, CIR, GIN, MI1, MI2, MF, QX
9. Formato de libros: **Binder** y **Anillado** (+ "3ra edición" como versión más básica)

### ⚠️ Discrepancias a resolver antes de desarrollar
| # | Item | DDL actual | Excel | Acción |
|---|------|-----------|-------|--------|
| 1 | Descuento alumno en libros | 30% | **35%** | Confirmar con cliente |
| 2 | Formato libros | Binder/Anillado | Binder/Anillado/3ra edición | Agregar "3ra edición" como format option |
| 3 | Método de pago | Sin CHEQUE en enum | Columna "Pago chq" presente | Agregar `CHEQUE` al enum de payment_method |

### 🆕 Datos/campos no modelados que hay que agregar
| Campo | Dónde | Qué es |
|-------|-------|--------|
| `interview_status` | `enrollments` | Si el alumno hizo entrevista previa |
| `is_partner_withdrawal` o tipo de egreso `RETIRO_SOCIO` | `budget_entries` o `contacts` | Retiros de socias (distinto al sueldo) |
| `CHEQUE` | enum `payment_method` | Medio de pago con cheque |
| Categoría `SUELDOS` separada de `HONORARIOS` | `budget_entries.category` | En el Excel son dos categorías distintas; en el DDL actual están bajo `FIXED` |

### 📋 Subcategorías reales para precargar en el sistema
El sistema debe precargar en `budget_entries.subcategory` los ítems reales del Excel para que los usuarios reconozcan su propia terminología. La lista completa está en la sección de la hoja Presupuesto arriba.
