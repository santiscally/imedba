-- =============================================================================
-- V036 — Respuestas de Nico del 2026-07-30.
--
-- 1) TUTORA deja de ser un rol y pasa a ser una casilla.
--    «Las tutoras son docentes que también hacen la parte de seguimiento […]
--     Por ahora sería solo detallarlo en la lista de docentes, se puede agregar
--     una casilla para tildar "TUTORA" y listo.»
--    O sea: una tutora ES una docente. Modelarla como un staff_type aparte era
--    incorrecto — obligaba a elegir entre "docente" y "tutora" cuando es las dos.
--    El seguimiento de tutoras queda para más adelante (va con las alertas de
--    pago, que están fuera de alcance).
--
-- 2) Los libros pasan a tener unidad de negocio.
--    «Los 7 libros son solo del área RM […] El de Prema lo mismo pero de
--     formación superior […] cuando matriculaba un alumno de Residencias me
--     dejaba incluirle el libro de prema en la matrícula. Podría ser que solo si
--     estoy matriculando en la unidad formación superior aparezca esa opción.»
--    Sin este campo no había forma de filtrar el selector de libros de la
--    inscripción por la unidad del curso.
-- =============================================================================

-- ─── 1) Tutora: de rol a casilla ────────────────────────────────────────────
ALTER TABLE staff ADD COLUMN is_tutor BOOLEAN NOT NULL DEFAULT false;

-- Quien estaba cargada como TUTORA es en realidad una docente que además tutorea.
UPDATE staff SET staff_type = 'DOCENTE', is_tutor = true WHERE staff_type = 'TUTORA';

ALTER TABLE staff DROP CONSTRAINT ck_staff_type;
ALTER TABLE staff ADD CONSTRAINT ck_staff_type CHECK (
    staff_type IN ('DOCENTE', 'PRECEPTORA', 'DIRECTORA'));

-- `activity_types.applies_to` seguía ofreciendo TUTORA como destinatario de una
-- tarifa; ya no es un rol, así que sale.
UPDATE activity_types SET applies_to = 'DOCENTE' WHERE applies_to = 'TUTORA';
ALTER TABLE activity_types DROP CONSTRAINT ck_activity_applies_to;
ALTER TABLE activity_types ADD CONSTRAINT ck_activity_applies_to CHECK (
    applies_to IN ('DOCENTE', 'PRECEPTORA', 'DIRECTORA', 'ALL'));

CREATE INDEX idx_staff_tutor ON staff (is_tutor) WHERE is_tutor AND deleted_at IS NULL;

COMMENT ON COLUMN staff.is_tutor IS
    'Marca que además de su rol hace seguimiento de alumnos. No es un rol aparte: una tutora es una docente.';


-- ─── 2) Unidad de negocio en libros y colecciones ───────────────────────────
-- NULL = disponible en todas las unidades (no fuerza a clasificar lo que ya está).
ALTER TABLE books       ADD COLUMN business_unit VARCHAR(30);
ALTER TABLE collections ADD COLUMN business_unit VARCHAR(30);

ALTER TABLE books ADD CONSTRAINT ck_books_business_unit CHECK (
    business_unit IS NULL OR business_unit IN (
        'RESIDENCIAS', 'FORMACION_SUPERIOR', 'EDITORIAL', 'GENERAL'));

ALTER TABLE collections ADD CONSTRAINT ck_collections_business_unit CHECK (
    business_unit IS NULL OR business_unit IN (
        'RESIDENCIAS', 'FORMACION_SUPERIOR', 'EDITORIAL', 'GENERAL'));

-- Los 7 libros cargados por V029 son todos de Residencias (confirmado por Nico).
-- El de PREMA todavía no está cargado; va a entrar como FORMACION_SUPERIOR.
UPDATE books       SET business_unit = 'RESIDENCIAS' WHERE business_unit IS NULL;
UPDATE collections SET business_unit = 'RESIDENCIAS' WHERE business_unit IS NULL;

CREATE INDEX idx_books_business_unit       ON books (business_unit)       WHERE deleted_at IS NULL;
CREATE INDEX idx_collections_business_unit ON collections (business_unit) WHERE deleted_at IS NULL;

COMMENT ON COLUMN books.business_unit IS
    'Unidad en la que se ofrece. Filtra el selector de libros de la inscripción por la unidad del curso. NULL = todas.';
