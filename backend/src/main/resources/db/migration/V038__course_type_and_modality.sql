-- =============================================================================
-- V038 — Separar «tipo de curso» de «modalidad» (correcciones 2026-07-23, 5.3).
--
-- Pedido de Nico:
--   «Tenemos que reordenar la diferenciación de cursos. […] Nosotros tenemos 3
--    variables. Nombre (dependen del examen que rinden, lo diferenciamos por
--    fecha o región): hoy están Tucumán, Córdoba, Uruguay y Junio/Julio. Tipo de
--    curso: Normal (o sin detalle, es el curso anual clásico), Intensivo y Choice.
--    Y por último modalidad: Libre y vivo. […] El curso puede ser Tucumán libre
--    intensivo, Córdoba vivo clásico. […] Quizás el nombre sea la variable
--    editable y las preestablecidas modalidad y tipo de curso.»
--
-- EL PROBLEMA QUE RESUELVE
--   `courses.modality` era VARCHAR(50) de texto libre y estaba cargando TRES
--   conceptos distintos a la vez:
--     - modalidad real          → LIBRE / VIVO
--     - tipo de curso           → TRADICIONAL, INTENSIVO, SUPER_INTENSIVO, MIX_FEBRERO
--     - producto de Formación Superior → «Diplomatura Prematuros», «Curso PAF»
--   Con los tres mezclados en una columna no había forma de agrupar por tipo ni
--   por modalidad, que es exactamente lo que el cliente necesita para analizar.
--
-- QUÉ QUEDA
--   name         → sigue siendo el texto editable (Tucumán, Córdoba, Junio/Julio…)
--   course_type  → NORMAL | INTENSIVO | CHOICE   (nuevo, preestablecido)
--   modality     → LIBRE | VIVO                  (acotado, preestablecido)
--
--   Reválida y «banco de preguntas» NO son tipo ni modalidad: son productos
--   aparte y siguen distinguiéndose por el nombre del curso.
--
-- SOBRE LOS DATOS EXISTENTES
--   Se mapea sólo lo que mapea sin ambigüedad (TRADICIONAL→NORMAL,
--   INTENSIVO→INTENSIVO). `SUPER_INTENSIVO`, `MIX_FEBRERO`, `PLUS` y los
--   productos de FS no tienen equivalencia en la taxonomía nueva y quedan NULL:
--   el cliente confirmó el 2026-07-30 que los cursos se recargan de cero, así
--   que no se inventa un mapeo que después haya que deshacer.
-- =============================================================================

ALTER TABLE courses ADD COLUMN course_type VARCHAR(20);

-- Se deriva ANTES de limpiar `modality`, que es de donde sale la información.
UPDATE courses SET course_type = 'NORMAL'    WHERE upper(modality) = 'TRADICIONAL';
UPDATE courses SET course_type = 'INTENSIVO' WHERE upper(modality) = 'INTENSIVO';

-- `modality` pasa a ser LIBRE|VIVO. Ninguno de los valores viejos era una
-- modalidad real, así que se limpia en vez de forzar una equivalencia falsa.
UPDATE courses SET modality = NULL
 WHERE modality IS NOT NULL AND upper(modality) NOT IN ('LIBRE', 'VIVO');
UPDATE courses SET modality = upper(modality) WHERE modality IS NOT NULL;

ALTER TABLE courses ALTER COLUMN modality TYPE VARCHAR(20);

ALTER TABLE courses ADD CONSTRAINT ck_courses_course_type CHECK (
    course_type IS NULL OR course_type IN ('NORMAL', 'INTENSIVO', 'CHOICE'));

ALTER TABLE courses ADD CONSTRAINT ck_courses_modality CHECK (
    modality IS NULL OR modality IN ('LIBRE', 'VIVO'));

-- Índices para poder agrupar y filtrar, que es el motivo del pedido.
CREATE INDEX idx_courses_course_type ON courses (course_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_courses_modality    ON courses (modality)    WHERE deleted_at IS NULL;

COMMENT ON COLUMN courses.course_type IS
    'NORMAL (anual clásico) | INTENSIVO | CHOICE. Preestablecido; NULL = sin especificar.';
COMMENT ON COLUMN courses.modality IS
    'LIBRE | VIVO. Antes de V038 era texto libre y mezclaba modalidad, tipo de curso y producto de FS.';
