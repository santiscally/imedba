-- =============================================================================
-- V012 — Budget entries (ingresos y egresos unificados).
--
-- Reemplaza el "múltiples Excel" de IMEDBA. Un único log append-centric con:
--   - entry_type: INCOME | EXPENSE
--   - category:   FIXED | VARIABLE | MAINTENANCE | INCOME_SALES | INCOME_ENROLLMENT | OTHER
--   - subcategory: texto libre ("Personal", "Alquiler", "Impresión", ...)
--   - business_unit: RESIDENCIAS | EDITORIAL | FORMACION_SUPERIOR | GENERAL
--
-- Flags:
--   - is_recurring: abonos/servicios fijos (se repiten mes a mes; a futuro el
--     backend puede clonar la entrada al próximo período automáticamente).
--   - is_cash: movimiento físico de caja (vs. transferencia/tarjeta).
--   - is_projected: entrada estimada (presupuesto) vs. real (ejecutado).
--
-- Linkeos opcionales:
--   - contact_id: empleado o proveedor (contacts).
--   - enrollment_id: si el ingreso viene de una inscripción.
--   - payment_id: si el ingreso viene de un Payment.
--   - book_sale_id: si el ingreso viene de una venta de libro.
--
-- period_month/period_year se derivan de entry_date pero se guardan como columnas
-- para índices rápidos en el dashboard.
-- =============================================================================

CREATE TABLE budget_entries (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_type         VARCHAR(10) NOT NULL,
    category           VARCHAR(30) NOT NULL,
    subcategory        VARCHAR(100),
    business_unit      VARCHAR(50),
    concept            VARCHAR(300) NOT NULL,
    amount             NUMERIC(12,2) NOT NULL,
    entry_date         DATE NOT NULL,
    period_month       INTEGER NOT NULL,
    period_year        INTEGER NOT NULL,
    payment_method     VARCHAR(30),
    is_recurring       BOOLEAN NOT NULL DEFAULT false,
    is_cash            BOOLEAN NOT NULL DEFAULT false,
    is_projected       BOOLEAN NOT NULL DEFAULT false,
    reference_number   VARCHAR(200),
    receipt_file_path  VARCHAR(500),
    contact_id         UUID REFERENCES contacts(id),
    enrollment_id      UUID REFERENCES enrollments(id),
    payment_id         UUID REFERENCES payments(id),
    book_sale_id       UUID REFERENCES book_sales(id),
    notes              TEXT,
    registered_by      UUID,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_budget_type CHECK (entry_type IN ('INCOME', 'EXPENSE')),
    CONSTRAINT ck_budget_category CHECK (category IN (
        'FIXED', 'VARIABLE', 'MAINTENANCE',
        'INCOME_SALES', 'INCOME_ENROLLMENT', 'INCOME_OTHER',
        'OTHER'
    )),
    CONSTRAINT ck_budget_business_unit CHECK (
        business_unit IS NULL OR business_unit IN (
            'RESIDENCIAS', 'PREMATUROS', 'EDITORIAL', 'FORMACION_SUPERIOR', 'GENERAL'
        )
    ),
    CONSTRAINT ck_budget_amount CHECK (amount >= 0),
    CONSTRAINT ck_budget_period_month CHECK (period_month BETWEEN 1 AND 12),
    CONSTRAINT ck_budget_period_year CHECK (period_year BETWEEN 2020 AND 2100)
);

CREATE INDEX idx_budget_period       ON budget_entries (period_year, period_month);
CREATE INDEX idx_budget_type         ON budget_entries (entry_type);
CREATE INDEX idx_budget_category     ON budget_entries (category);
CREATE INDEX idx_budget_business     ON budget_entries (business_unit) WHERE business_unit IS NOT NULL;
CREATE INDEX idx_budget_entry_date   ON budget_entries (entry_date DESC);
CREATE INDEX idx_budget_contact      ON budget_entries (contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_budget_enrollment   ON budget_entries (enrollment_id) WHERE enrollment_id IS NOT NULL;
CREATE INDEX idx_budget_payment      ON budget_entries (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX idx_budget_book_sale    ON budget_entries (book_sale_id) WHERE book_sale_id IS NOT NULL;
CREATE INDEX idx_budget_recurring    ON budget_entries (is_recurring) WHERE is_recurring = true;

-- Evita duplicados en el auto-link: un Payment sólo puede generar un INCOME.
CREATE UNIQUE INDEX uk_budget_payment_unique ON budget_entries (payment_id)
    WHERE payment_id IS NOT NULL;
CREATE UNIQUE INDEX uk_budget_book_sale_unique ON budget_entries (book_sale_id)
    WHERE book_sale_id IS NOT NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON budget_entries
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
