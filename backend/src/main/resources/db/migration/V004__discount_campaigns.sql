-- =============================================================================
-- V004 — Campañas de descuento (la lógica de aplicación vive en Fase 2 — Cobranza).
-- Se crea la tabla ya para que enrollments.discount_campaign_id tenga FK válida.
-- =============================================================================

CREATE TABLE discount_campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    discount_type   VARCHAR(20)  NOT NULL,   -- PERCENTAGE, FIXED_AMOUNT
    discount_value  NUMERIC(10,2) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_discount_campaigns_dates CHECK (end_date >= start_date),
    CONSTRAINT ck_discount_campaigns_type  CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT'))
);

CREATE INDEX idx_discount_campaigns_active_range
    ON discount_campaigns (start_date, end_date)
    WHERE is_active = true;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON discount_campaigns
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
