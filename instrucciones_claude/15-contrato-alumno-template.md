# Contrato de matrícula — template + ejemplo

> Entregables del cliente (Jaque, vía Fran 2026-06-28) que cierran el bloqueo
> de **§8 Email — alta de inscripción** (doc `14-requerimientos-reunion-20260612.md`).
> Lo que faltaba era el PDF a enviar automáticamente al alta. Está acá.

## Archivos

- **`contratos/contrato-template-final.docx`** — ⭐ **Es el template oficial nuevo** que IMEDBA quiere usar de acá en adelante. Tiene placeholders en blanco; hay que rellenarlos con datos del alumno/curso/inscripción antes de mandar.
- **`contratos/contrato-ejemplo-rivero-ileana.pdf`** — Ejemplo concreto del modelo VIEJO completado (alumno real Ileana Rivero, curso "Salta Intensivo", $812.500). Solo sirve como referencia visual de cómo se ve un contrato emitido. **No usar como plantilla — está desactualizado.**

## Diferencias entre viejo (PDF) y nuevo (DOCX)

| | PDF viejo (Rivero) | DOCX nuevo (template) |
|---|---|---|
| Dirección | Gavilán 2628 | **Rojas 61** |
| Cláusulas | 9 (PRIMERA → NOVENA) | **13** (agrega DÉCIMA → DÉCIMA TERCERA) |
| Mora | hardcodeado "día 1-10 + recargo día 10-20" | **"período de vencimiento informado por la Institución"** — abstracto, compatible con Grupos 1/2 |
| Cláusula Séptima | Modalidad/precios/beneficios solo | **Pases** (compatibilidad explícita con el módulo Pases futuro — % uso plataforma, RTP, etc.) |
| Protección de datos | no | **Sí** (cláusula DÉCIMA PRIMERA, Ley 25.326) |
| Jurisdicción | no | **Sí** (DÉCIMA TERCERA, Tribunales CABA) |

## Estructura del template (campos a rellenar)

```
DATOS DEL ALUMNO
  Nombre · Apellido · Nacionalidad · D.N.I. · Fecha de nacimiento · E-mail

DATOS ECONÓMICOS
  Valor curso · Importe Total · Descuento

GRUPOS OFERTADOS
  Nombre del grupo · Inicio · Fin

(13 cláusulas — texto fijo, no varía por alumno)

Firma y fecha: _________________________________
```

## Mapeo a entidades del backend

| Campo template | Origen |
|---|---|
| Nombre / Apellido / DNI / Fecha nac / E-mail / Nacionalidad | `Student` |
| Valor curso | `Enrollment.listPrice` (o `Course.coursePrice` si listPrice null) |
| Descuento | `Enrollment.discountPercentage` aplicado al listPrice |
| Importe Total | `Enrollment.totalPrice` (curso + matrícula + libros) |
| Nombre del grupo | `Course.name` (o `Course.modality`) |
| Inicio / Fin | ⚠️ El backend no modela start/end de curso. Habría que sumarle `startDate`/`endDate` a `Course` o dejar en blanco / "A confirmar" |

## Pendiente para Santi (backend)

1. **Decidir generación del PDF**:
   - Opción A: rellenar el .docx con docx4j → convertir a PDF (LibreOffice headless o Aspose)
   - Opción B: re-armar como HTML+CSS → wkhtmltopdf / Puppeteer
   - Opción C: usar template engine de mail (SendGrid dynamic templates con el HTML del contrato adentro)
2. **Adjuntar al mail de bienvenida** (NotificationType.WELCOME ya existe).
3. **Setear `Enrollment.contractFilePath`** cuando se genera, **`contractSentAt`** cuando se envía, **`contractSignedAt`** cuando vuelve firmado (UX futura para upload del firmado).
4. **Campos faltantes en `Course`**: `startDate` / `endDate` para que el contrato pueda decir "Inicio / Fin" del grupo. Si no se modela, el template los deja en blanco.

## Frontend (Fran) — lo que va a tocar después

Cuando la pipeline mail esté funcionando, en `EnrollmentDetail` ya tenemos los campos del tipo (`contractFilePath`, `contractSentAt`, `contractSignedAt`). Solo falta:
- Badge "Contrato enviado" cuando `contractSentAt != null`
- Link al PDF cuando `contractFilePath != null`
- Botón "Marcar como firmado" / upload del PDF firmado (cuando el back exponga endpoint)

No hago nada hoy — espero la pipeline.
