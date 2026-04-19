-- =============================================================================
-- V002 — Alumnos
-- =============================================================================

CREATE TABLE students (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    dni             VARCHAR(20),
    nationality     VARCHAR(100),
    university      VARCHAR(200),
    locality        VARCHAR(200),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    moodle_user_id  INTEGER,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID,
    deleted_at      TIMESTAMPTZ
);

-- Email único entre alumnos NO borrados (un soft-delete libera el email).
CREATE UNIQUE INDEX uk_students_email_active
    ON students (LOWER(email))
    WHERE deleted_at IS NULL;

-- DNI único entre alumnos NO borrados (si se provee).
CREATE UNIQUE INDEX uk_students_dni_active
    ON students (dni)
    WHERE deleted_at IS NULL AND dni IS NOT NULL;

-- Búsqueda por nombre con trigram — soporta tipeos y substrings.
CREATE INDEX idx_students_fullname_trgm
    ON students USING gin ((LOWER(first_name || ' ' || last_name)) gin_trgm_ops);

-- Índice útil cuando el WHERE filtra deleted_at IS NULL + activos.
CREATE INDEX idx_students_active_not_deleted
    ON students (is_active)
    WHERE deleted_at IS NULL;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
