-- =============================================================================
-- V014 — Diplomas + diploma_enrollments + diploma_settlements (Formación Superior).
--
-- Un diploma puede ser en convenio con una universidad. Absorbe la config de
-- distribución como campos + socias como JSONB `partners_config`:
--   [ { "name": "...", "pct": 25.0, "email": "..." }, ... ]
--
-- diploma_enrollments registra alumnos inscritos en diplomaturas (separado
-- de enrollments de cursos para independencia del motor de cuotas).
--
-- diploma_settlements es la liquidación mensual: input = total_collected; el
-- motor aplica tax_commission_pct → secretary → advertising → admin_pct →
-- university_pct → imedba_pct → reparte remanente entre socias según
-- partners_distribution (snapshot del config al momento de liquidar).
-- UNIQUE(diploma,period) garantiza una liquidación por mes.
-- =============================================================================

CREATE TABLE diplomas (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(300) NOT NULL,
    university_name         VARCHAR(200),
    description             TEXT,
    enrollment_price        DECIMAL(12,2),
    course_price            DECIMAL(12,2),

    tax_commission_pct      DECIMAL(5,2) DEFAULT 0,
    secretary_salary        DECIMAL(12,2) DEFAULT 0,
    advertising_amount      DECIMAL(12,2) DEFAULT 0,
    admin_pct               DECIMAL(5,2) DEFAULT 0,
    university_pct          DECIMAL(5,2) DEFAULT 0,
    imedba_pct              DECIMAL(5,2) DEFAULT 0,

    partners_config         JSONB NOT NULL DEFAULT '[]'::jsonb,

    is_active               BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID,
    deleted_at              TIMESTAMPTZ,

    CONSTRAINT ck_diplomas_pcts CHECK (
        COALESCE(tax_commission_pct,0) >= 0 AND COALESCE(tax_commission_pct,0) <= 100
        AND COALESCE(admin_pct,0)      >= 0 AND COALESCE(admin_pct,0)      <= 100
        AND COALESCE(university_pct,0) >= 0 AND COALESCE(university_pct,0) <= 100
        AND COALESCE(imedba_pct,0)     >= 0 AND COALESCE(imedba_pct,0)     <= 100
    ),
    CONSTRAINT ck_diplomas_fixed CHECK (
        COALESCE(secretary_salary,0)   >= 0
        AND COALESCE(advertising_amount,0) >= 0
    )
);

CREATE INDEX idx_diplomas_active ON diplomas (is_active) WHERE deleted_at IS NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON diplomas
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


CREATE TABLE diploma_enrollments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diploma_id          UUID NOT NULL REFERENCES diplomas(id),
    student_id          UUID NOT NULL REFERENCES students(id),
    enrollment_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    num_installments    INTEGER NOT NULL DEFAULT 1,
    payment_method      VARCHAR(30),
    status              VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    pending_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID,
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT ck_diploma_enr_status CHECK (
        status IN ('ACTIVE','SUSPENDED','COMPLETED','CANCELLED')),
    CONSTRAINT ck_diploma_enr_inst   CHECK (num_installments BETWEEN 1 AND 60),
    CONSTRAINT ck_diploma_enr_amount CHECK (pending_amount >= 0)
);

CREATE INDEX idx_diploma_enr_diploma ON diploma_enrollments (diploma_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_diploma_enr_student ON diploma_enrollments (student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_diploma_enr_status  ON diploma_enrollments (status)     WHERE deleted_at IS NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON diploma_enrollments
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


CREATE TABLE diploma_settlements (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diploma_id              UUID NOT NULL REFERENCES diplomas(id),
    period_month            INTEGER NOT NULL,
    period_year             INTEGER NOT NULL,
    total_collected         DECIMAL(12,2) NOT NULL,
    tax_commission_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
    secretary_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
    advertising_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    admin_amount            DECIMAL(12,2) NOT NULL DEFAULT 0,
    university_amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
    imedba_amount           DECIMAL(12,2) NOT NULL DEFAULT 0,
    partners_total          DECIMAL(12,2) NOT NULL DEFAULT 0,

    partners_distribution   JSONB NOT NULL DEFAULT '[]'::jsonb,

    status                  VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID,

    CONSTRAINT uk_diploma_settlement_period UNIQUE (diploma_id, period_year, period_month),
    CONSTRAINT ck_diploma_set_period CHECK (
        period_month BETWEEN 1 AND 12 AND period_year BETWEEN 2020 AND 2100),
    CONSTRAINT ck_diploma_set_collected CHECK (total_collected >= 0),
    CONSTRAINT ck_diploma_set_status CHECK (status IN ('DRAFT','APPROVED','PAID'))
);

CREATE INDEX idx_diploma_set_diploma ON diploma_settlements (diploma_id);
CREATE INDEX idx_diploma_set_period  ON diploma_settlements (period_year, period_month);
CREATE INDEX idx_diploma_set_status  ON diploma_settlements (status);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON diploma_settlements
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
