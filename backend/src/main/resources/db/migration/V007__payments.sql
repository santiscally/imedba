-- =============================================================================
-- V007 — Pagos (payments).
--
-- Un pago puede:
--   - Ser imputado a una cuota (installment_id NOT NULL): cobro normal.
--   - Ser imputado sólo a la inscripción (installment_id NULL): p.ej. pago total.
-- Siempre queda registrado el enrollment_id para facilidad de queries.
-- receipt_number es único (lo genera el backend al confirmar el pago).
-- =============================================================================

CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_id      UUID REFERENCES installments(id),
    enrollment_id       UUID NOT NULL REFERENCES enrollments(id),
    amount              NUMERIC(12,2) NOT NULL,
    payment_method      VARCHAR(30) NOT NULL,   -- TRANSFERENCIA, EFECTIVO, TARJETA_CREDITO, TARJETA_DEBITO, MERCADO_PAGO, DEBITO_AUTOMATICO
    payment_date        TIMESTAMPTZ NOT NULL,
    reference_number    VARCHAR(200),           -- nro de operación externa (transferencia, etc.)
    receipt_number      VARCHAR(50) UNIQUE,     -- recibo generado por el sistema
    receipt_file_path   VARCHAR(500),
    receipt_sent_at     TIMESTAMPTZ,
    notes               TEXT,
    registered_by       UUID,                   -- sub de Keycloak
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_payments_amount CHECK (amount > 0),
    CONSTRAINT ck_payments_method CHECK (payment_method IN (
        'TRANSFERENCIA', 'EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO',
        'MERCADO_PAGO', 'DEBITO_AUTOMATICO', 'OTRO'
    ))
);

CREATE INDEX idx_payments_enrollment     ON payments (enrollment_id);
CREATE INDEX idx_payments_installment    ON payments (installment_id) WHERE installment_id IS NOT NULL;
CREATE INDEX idx_payments_date           ON payments (payment_date DESC);
CREATE INDEX idx_payments_method         ON payments (payment_method);
CREATE INDEX idx_payments_registered_by  ON payments (registered_by) WHERE registered_by IS NOT NULL;
