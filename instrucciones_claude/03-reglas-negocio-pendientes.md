# Reglas de Negocio Pendientes de Definición - IMEDBA

> Este documento recopila todas las preguntas y definiciones de negocio que no pudieron ser resueltas en la etapa de planeamiento. Deben responderse antes de comenzar el desarrollo del módulo correspondiente.

## Estado: 🔴 = Bloqueante | 🟡 = Importante | 🟢 = Puede diferirse

---

## 1. EDITORIAL

### 🔴 1.1 Gestión de Sedes
- **Pregunta**: ¿Cuántas sedes tienen actualmente y cuáles son?
- **Impacto**: Define la tabla `branches` y toda la lógica de stock por sede.
- **Necesario antes de**: Desarrollo del módulo Editorial y Stock.
- **Decisión temporal**: Se crea el catálogo de sedes vacío, listo para cargar.

### 🟡 1.2 Rol de Carga de Stock
- **Pregunta**: ¿Quién se encarga de cargar el stock cuando llega una impresión nueva?
- **Recomendación**: Crear un permiso específico `stock:write` asignable a cualquier rol.
- **Decisión temporal**: Se implementa el permiso granular; el admin decide a quién asignarlo.

### 🟡 1.3 Detalle de Autorías por Autor
- **Pregunta**: ¿El porcentaje de autoría es el mismo para todos los autores de un libro o varía entre ellos?
- **Respuesta parcial**: Es fijo por autor. Pero falta confirmar: ¿un mismo autor tiene el mismo % en todos los libros o puede variar por libro?
- **Decisión temporal**: Se modela por la relación libro-autor (`book_authors`), permitiendo % distinto por combinación.

---

## 2. FORMACIÓN SUPERIOR (DIPLOMATURAS)

### 🔴 2.1 Flujo de Distribución Variable
- **Pregunta**: ¿El flujo de distribución de la liquidación (impuestos → secretaria → publicidad → admin → universidad → socias) puede cambiar por diplomatura? ¿O siempre son los mismos pasos?
- **Impacto**: Define si `diploma_distribution_configs` es una tabla fija o necesita configuración flexible por diplomatura.
- **Decisión temporal**: Se implementa configurable por diplomatura (`diploma_distribution_configs`), con valores por defecto heredables.

### 🔴 2.2 Porcentajes de Distribución
- **Pregunta**: ¿Cuáles son los porcentajes exactos para cada concepto de la liquidación?
- **Datos conocidos del Excel**:
  - Impuestos y comisiones: ~25.1%
  - Sueldo secretaria: monto fijo ($500.000/mes por diplomatura en los datos)
  - Publicidad: monto fijo
  - Administración: monto fijo o %
  - Universidad (UNTREF): % del subtotal (~20% según datos)
  - IMEDBA: %
  - Socias docentes: remanente
- **Necesario antes de**: Desarrollo del motor de liquidación.

### 🟡 2.3 Cantidad de Diplomaturas
- **Pregunta**: ¿Cuántas diplomaturas tienen actualmente? ¿Están todas con la misma universidad (UNTREF)?
- **Impacto**: Define si la universidad es un atributo de la diplomatura o una entidad separada.
- **Decisión temporal**: Se modela como atributo VARCHAR en `diplomas`.

### 🟡 2.4 Cantidad Variable de Socias
- **Pregunta**: ¿El número de socias docentes puede cambiar por diplomatura? ¿Y en el tiempo (se pueden sumar o quitar)?
- **Respuesta**: Sí, puede variar.
- **Decisión temporal**: Modelado con tabla `diploma_partners` con `is_active` y sin límite.

---

## 3. DOCENTES Y TUTORAS

### 🟡 3.1 Esquema de Pago de Tutoras
- **Pregunta**: ¿Las tutoras cobran por hora (como los docentes) o tienen un esquema diferente (mensual fijo, por cantidad de alumnos, etc.)?
- **Impacto**: Define si `tutors` comparte la misma lógica de `hour_logs` y `teacher_rates` o necesita su propio módulo.
- **Decisión temporal**: Se modela con la misma estructura que docentes (horas × valor hora), usando `activity_types` con `applies_to = TUTOR`.

### 🟡 3.2 Valores Hora por Tipo de Actividad
- **Pregunta**: ¿Cada tipo de actividad (Clases, EVS Vivo, EVS Grabado, Preceptora, Aperturas) tiene un valor hora diferente? ¿O solo hay dos valores (Hora Argentina y Hora Preceptora)?
- **Datos conocidos del Excel**:
  - Hora Argentina: $75.000
  - Hora Preceptora: $8.000
- **Necesario antes de**: Desarrollo del módulo de liquidación docente.
- **Decisión temporal**: Se modela con tabla `teacher_rates` por `activity_type`, permitiendo N valores distintos.

### 🟡 3.3 Gestión de Facturas de Docentes
- **Pregunta**: Cuando se envía el mail solicitando factura, ¿el docente la sube al sistema, la envía por email, o la entrega en mano?
- **Impacto**: Define si se necesita un portal de docentes o solo un flag manual.
- **Decisión temporal**: Se implementa como flujo manual: el admin marca la factura como recibida y opcionalmente sube el archivo.

---

## 4. PRESUPUESTO Y CONTABILIDAD

### 🟡 4.1 Variabilidad de Sueldos
- **Pregunta**: ¿Los sueldos de los empleados son fijos mensuales o varían mes a mes?
- **Nota del cliente**: "No te metas en esto."
- **Decisión temporal**: Se modela como egresos simples bajo la subcategoría "Personal". No se implementa módulo de liquidación de sueldos.

### 🟡 4.2 Bonos y Aguinaldos
- **Pregunta**: ¿En qué meses exactos se pagan los bonos que simulan aguinaldos?
- **Nota del cliente**: "No te metas en esto."
- **Decisión temporal**: Se implementa el sistema de alertas configurable. El admin carga manualmente las fechas de pago de bonos como alertas recurrentes.

### 🟡 4.3 Caja Efectivo como Módulo Independiente
- **Pregunta**: ¿La caja en efectivo es un módulo separado del presupuesto general o se unifica?
- **Impacto**: Define si los movimientos de caja son un subset de los ingresos/egresos generales o tienen su propio flujo.
- **Decisión temporal**: Se implementa como módulo separado (`cash_register_entries`) que puede linkearse opcionalmente a ingresos/egresos del presupuesto.

---

## 5. INTEGRACIÓN MOODLE

### 🟡 5.1 Versión y Configuración de Moodle
- **Pregunta**: ¿Qué versión de Moodle usan? ¿Moodle estándar, Cloud, o fork?
- **Respuesta**: No lo saben. Hay un programador externo que lo gestiona.
- **Necesario antes de**: Fase de integración con Moodle.
- **Acción**: Consultar con el programador de Moodle (ver documento `06-moodle-integration-spec.md`).

### 🟡 5.2 Acceso a la API de Moodle
- **Pregunta**: ¿Tienen acceso a la API REST de Moodle? ¿Hay tokens configurados?
- **Respuesta**: No tienen acceso; el programador externo lo gestiona.
- **Acción**: Solicitar al programador: versión, URL de la API, token, funciones habilitadas.

---

## 6. COMUNICACIÓN Y NOTIFICACIONES

### 🟢 6.1 SendGrid - Configuración
- **Pregunta**: ¿Tienen un plan de SendGrid activo? ¿Cuál? ¿Tienen dominio verificado?
- **Info necesaria del cliente**:
  - API Key (para variable de entorno)
  - Dirección de email del sender verificado
  - Plan actual y límites de envío mensual
- **Acción**: Solicitar estos datos antes de configurar el módulo de notificaciones.

### 🟢 6.2 Diseño de Emails
- **Pregunta**: ¿Tienen diseño/branding definido para los emails (logo, colores, etc.)?
- **Impacto**: Templates de email.
- **Decisión temporal**: Se usan templates simples con el logo de IMEDBA que se refinan después.

---

## 7. DATOS GENERALES

### 🟢 7.1 Migración de Datos
- **Pregunta**: ¿Necesitan migrar los datos históricos de los Excel al nuevo sistema o arrancan de cero?
- **Impacto**: Define si se necesita un script de migración ETL.
- **Decisión temporal**: Se diseña la estructura pensando en que se pueda importar. Se desarrolla un importador como fase separada si es necesario.

### 🟢 7.2 Zona Horaria
- **Confirmación necesaria**: ¿Todo opera en zona horaria Argentina (UTC-3)?
- **Decisión temporal**: Se configura `America/Argentina/Buenos_Aires` como timezone del sistema.

---

## Próximos Pasos

1. **Priorizar** las preguntas 🔴 (bloqueantes) para cada fase de desarrollo.
2. **Agendar reunión** con el equipo de IMEDBA para resolver las preguntas de Formación Superior y Editorial antes de comenzar esos módulos.
3. **Contactar al programador de Moodle** con el documento de especificaciones de integración.
4. **Solicitar datos de SendGrid** al equipo técnico/admin.
