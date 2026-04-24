-- =============================================================================
-- V013 — Staff + activity_types + hour_logs.
--
-- Docentes + tutoras + preceptoras en una única tabla con staff_type.
-- activity_types es lookup simple con rate_per_hour (valor hora vigente).
-- hour_logs registra partes mensuales: staff × actividad × mes/año con horas y
-- valor hora capturado al momento del cierre del parte (no referencia: se copia
-- al campo rate_per_hour del log para que un cambio de tarifa no reescriba
-- historia).
--
-- Flujo de factura embebido: invoice_email_sent_at → invoice_received → paid_at.
-- payment_status tracklea PENDING → INVOICE_RECEIVED → PAID.
--
-- Soft delete sólo en staff (los hour_logs son append-only; se corrigen con
-- carga nueva de signo opuesto si hace falta).
-- =============================================================================

CREATE TABLE staff (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name       VARCHAR(100) NOT NULL,
    last_name        VARCHAR(100) NOT NULL,
    email            VARCHAR(255),
    phone            VARCHAR(50),
    staff_type       VARCHAR(20) NOT NULL,
    is_active        BOOLEAN NOT NULL DEFAULT true,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by       UUID,
    deleted_at       TIMESTAMPTZ,

    CONSTRAINT ck_staff_type CHECK (staff_type IN ('DOCENTE', 'TUTORA', 'PRECEPTORA'))
);

CREATE INDEX idx_staff_type   ON staff (staff_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_staff_active ON staff (is_active)  WHERE deleted_at IS NULL;
CREATE INDEX idx_staff_email  ON staff (lower(email)) WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


CREATE TABLE activity_types (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(100) NOT NULL UNIQUE,
    rate_per_hour  DECIMAL(12,2) NOT NULL,
    applies_to     VARCHAR(20) NOT NULL DEFAULT 'ALL',
    is_active      BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT ck_activity_applies_to CHECK (applies_to IN ('DOCENTE', 'TUTORA', 'ALL')),
    CONSTRAINT ck_activity_rate_nonneg CHECK (rate_per_hour >= 0)
);

CREATE INDEX idx_activity_types_active ON activity_types (is_active);


CREATE TABLE hour_logs (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id                 UUID NOT NULL REFERENCES staff(id),
    activity_type            VARCHAR(100) NOT NULL,
    period_month             INTEGER NOT NULL,
    period_year              INTEGER NOT NULL,
    hours                    DECIMAL(6,2) NOT NULL,
    rate_per_hour            DECIMAL(12,2) NOT NULL,
    total_amount             DECIMAL(12,2) NOT NULL,

    invoice_email_sent_at    TIMESTAMPTZ,
    invoice_received         BOOLEAN NOT NULL DEFAULT false,
    invoice_file_path        VARCHAR(500),
    payment_status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    paid_at                  TIMESTAMPTZ,

    notes                    TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by               UUID,

    CONSTRAINT ck_hour_logs_month      CHECK (period_month BETWEEN 1 AND 12),
    CONSTRAINT ck_hour_logs_year       CHECK (period_year BETWEEN 2020 AND 2100),
    CONSTRAINT ck_hour_logs_hours_pos  CHECK (hours > 0),
    CONSTRAINT ck_hour_logs_rate_pos   CHECK (rate_per_hour >= 0),
    CONSTRAINT ck_hour_logs_total_pos  CHECK (total_amount >= 0),
    CONSTRAINT ck_hour_logs_status     CHECK (payment_status IN ('PENDING', 'INVOICE_RECEIVED', 'PAID'))
);

CREATE INDEX idx_hour_logs_staff       ON hour_logs (staff_id);
CREATE INDEX idx_hour_logs_period      ON hour_logs (period_year, period_month);
CREATE INDEX idx_hour_logs_status      ON hour_logs (payment_status);
CREATE INDEX idx_hour_logs_staff_period ON hour_logs (staff_id, period_year, period_month);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hour_logs
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
