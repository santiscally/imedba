-- =============================================================================
-- V006 — Cuotas (installments) de una inscripción.
--
-- Reglas de negocio (fase 2 — cobranza):
--   - number = 0  => matrícula (enrollment fee); number >= 1 => cuota mensual.
--   - Vencimiento día 1–10 (relativo a due_date): sin recargo.
--   - Día 11+: surcharge_amount += 5% del amount (scheduler diario).
--   - Día 20: notificación "a dos días de suspensión" (SendGrid).
--   - Día 22: suspender acceso Moodle (marca moodle_status en enrollments).
-- =============================================================================

CREATE TABLE installments (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id         UUID NOT NULL REFERENCES enrollments(id),
    number                INTEGER NOT NULL,               -- 0 = matrícula, 1..N = cuota
    amount                NUMERIC(12,2) NOT NULL,
    surcharge_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    due_date              DATE NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, OVERDUE
    paid_at               TIMESTAMPTZ,
    last_alert_sent_at    TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_installments_status
        CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')),
    CONSTRAINT ck_installments_number
        CHECK (number >= 0),
    CONSTRAINT ck_installments_amount
        CHECK (amount >= 0),
    CONSTRAINT ck_installments_surcharge
        CHECK (surcharge_amount >= 0)
);

-- Una inscripción no puede tener dos cuotas con el mismo número.
CREATE UNIQUE INDEX uk_installments_enrollment_number
    ON installments (enrollment_id, number);

CREATE INDEX idx_installments_enrollment   ON installments (enrollment_id);
CREATE INDEX idx_installments_status       ON installments (status);
CREATE INDEX idx_installments_due_date     ON installments (due_date);

-- Índice parcial para el scheduler de recargos/suspensión: sólo vencidas pendientes.
CREATE INDEX idx_installments_overdue_pending
    ON installments (due_date)
    WHERE status = 'PENDING';

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON installments
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
