-- =============================================================================
-- V005 — Inscripciones (absorbe payment plan + contrato como campos)
-- =============================================================================

CREATE TABLE enrollments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id              UUID NOT NULL REFERENCES students(id),
    course_id               UUID NOT NULL REFERENCES courses(id),
    discount_campaign_id    UUID REFERENCES discount_campaigns(id),
    enrolled_by             UUID,                          -- sub de Keycloak (vendedora)
    enrollment_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Precios
    list_price              NUMERIC(12,2) NOT NULL,
    discount_percentage     NUMERIC(5,2)  NOT NULL DEFAULT 0,
    final_price             NUMERIC(12,2) NOT NULL,
    book_price              NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_price             NUMERIC(12,2) NOT NULL,

    -- Plan de pago (absorbido)
    enrollment_fee          NUMERIC(12,2),
    num_installments        INTEGER NOT NULL DEFAULT 1,
    payment_method          VARCHAR(30),                   -- TRANSFERENCIA, EFECTIVO, TARJETA_CREDITO, TARJETA_DEBITO, MERCADO_PAGO, DEBITO_AUTOMATICO

    -- Contrato (absorbido)
    contract_file_path      VARCHAR(500),
    contract_sent_at        TIMESTAMPTZ,
    contract_signed_at      TIMESTAMPTZ,

    -- Estado
    status                  VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, SUSPENDED, COMPLETED, CANCELLED
    moodle_status           VARCHAR(20),                            -- ACTIVE, SUSPENDED, NOT_SYNCED

    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID,
    deleted_at              TIMESTAMPTZ,

    CONSTRAINT ck_enrollments_status
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT ck_enrollments_num_installments
        CHECK (num_installments >= 1),
    CONSTRAINT ck_enrollments_discount_pct
        CHECK (discount_percentage BETWEEN 0 AND 100)
);

-- Un alumno no debería tener dos inscripciones activas al mismo curso simultáneamente.
-- Lo expresamos como índice único parcial (soft-delete aware).
CREATE UNIQUE INDEX uk_enrollments_student_course_active
    ON enrollments (student_id, course_id)
    WHERE deleted_at IS NULL AND status IN ('ACTIVE', 'SUSPENDED');

CREATE INDEX idx_enrollments_student       ON enrollments (student_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_enrollments_course        ON enrollments (course_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_enrollments_enrolled_by   ON enrollments (enrolled_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_enrollments_status        ON enrollments (status)      WHERE deleted_at IS NULL;
CREATE INDEX idx_enrollments_enrollment_dt ON enrollments (enrollment_date DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
