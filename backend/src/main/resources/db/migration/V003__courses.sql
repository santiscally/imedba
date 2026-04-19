-- =============================================================================
-- V003 — Cursos (catálogo)
-- =============================================================================

CREATE TABLE courses (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(200) NOT NULL,
    code                    VARCHAR(50),
    description             TEXT,
    business_unit           VARCHAR(50) NOT NULL,   -- RESIDENCIAS, PREMATUROS, EDITORIAL, OTROS
    modality                VARCHAR(50),            -- Tradicional, Intensivo, MIX, Super Intensivo
    enrollment_price        NUMERIC(12,2),
    course_price            NUMERIC(12,2),
    exam_date               DATE,
    contract_template_path  VARCHAR(500),
    moodle_course_id        INTEGER,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID,
    deleted_at              TIMESTAMPTZ
);

CREATE UNIQUE INDEX uk_courses_code_active
    ON courses (code)
    WHERE deleted_at IS NULL AND code IS NOT NULL;

CREATE INDEX idx_courses_business_unit
    ON courses (business_unit)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_courses_name_trgm
    ON courses USING gin (LOWER(name) gin_trgm_ops);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
