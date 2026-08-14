-- =============================================================================
-- V036 — Liquidación de comisiones de vendedora.
--
-- Reunión 2026-07-24 + `liquidaciones-especificacion-20260724.docx`. Fórmula
-- verificada contra `liquidacion-comisiones-junio2026.csv` (ver doc 17, §3.1):
--
--   base            = lo COBRADO en el mes (no lo facturado)
--   alícuota        = 0,5% para las ventas 1..30 del mes de ORIGEN de la venta
--                     1,0% de la venta 31 en adelante
--                     0,5% siempre para libros sueltos (no consumen ranking)
--   la alícuota queda FIJADA por el rango de la venta en su mes de origen y se
--   aplica a todas sus cuotas futuras, se cobren cuando se cobren.
--
-- `sales_commission_settlements` guarda los totales por bucket, replicando la
-- planilla: cursos 0,5% / cursos 1% / libros / ventas de meses anteriores.
-- Los parámetros (alícuotas y umbral) se snapshotean por liquidación — mismo
-- criterio que V018 para diplomaturas: lo emitido no se reescribe si mañana
-- cambia la política de comisiones.
--
-- `sales_commission_lines` es el detalle auditable (la "grilla" que hoy Nico
-- mantiene a mano en Excel). Se regenera entera en cada recompute del DRAFT.
-- =============================================================================

CREATE TABLE sales_commission_settlements (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_user_id            UUID NOT NULL,           -- sub de Keycloak (enrolled_by / sold_by)
    seller_name               VARCHAR(200),            -- snapshot legible al liquidar
    period_month              INTEGER NOT NULL,
    period_year               INTEGER NOT NULL,

    -- Parámetros congelados al liquidar
    tier1_rate                NUMERIC(6,5) NOT NULL DEFAULT 0.00500,
    tier2_rate                NUMERIC(6,5) NOT NULL DEFAULT 0.01000,
    books_rate                NUMERIC(6,5) NOT NULL DEFAULT 0.00500,
    tier_threshold            INTEGER      NOT NULL DEFAULT 30,

    -- Buckets (replican las filas de la planilla)
    tier1_base                NUMERIC(14,2) NOT NULL DEFAULT 0,
    tier1_commission          NUMERIC(14,2) NOT NULL DEFAULT 0,
    tier2_base                NUMERIC(14,2) NOT NULL DEFAULT 0,
    tier2_commission          NUMERIC(14,2) NOT NULL DEFAULT 0,
    books_base                NUMERIC(14,2) NOT NULL DEFAULT 0,
    books_commission          NUMERIC(14,2) NOT NULL DEFAULT 0,
    prior_months_base         NUMERIC(14,2) NOT NULL DEFAULT 0,
    prior_months_commission   NUMERIC(14,2) NOT NULL DEFAULT 0,

    -- Único redondeo del cálculo: se suma sin redondear y se redondea acá.
    -- (Sumar los buckets ya redondeados da 1 centavo de más — ver doc 17 §3.1.)
    total_commission          NUMERIC(14,2) NOT NULL DEFAULT 0,

    status                    VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    notes                     TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                UUID,

    CONSTRAINT uk_sales_comm_seller_period UNIQUE (seller_user_id, period_year, period_month),
    CONSTRAINT ck_sales_comm_period CHECK (
        period_month BETWEEN 1 AND 12 AND period_year BETWEEN 2020 AND 2100),
    CONSTRAINT ck_sales_comm_status CHECK (status IN ('DRAFT','APPROVED','PAID')),
    CONSTRAINT ck_sales_comm_rates CHECK (
        tier1_rate >= 0 AND tier1_rate <= 1
        AND tier2_rate >= 0 AND tier2_rate <= 1
        AND books_rate >= 0 AND books_rate <= 1),
    CONSTRAINT ck_sales_comm_threshold CHECK (tier_threshold >= 0),
    CONSTRAINT ck_sales_comm_amounts CHECK (
        tier1_base >= 0 AND tier1_commission >= 0
        AND tier2_base >= 0 AND tier2_commission >= 0
        AND books_base >= 0 AND books_commission >= 0
        AND prior_months_base >= 0 AND prior_months_commission >= 0
        AND total_commission >= 0)
);

CREATE INDEX idx_sales_comm_seller ON sales_commission_settlements (seller_user_id);
CREATE INDEX idx_sales_comm_period ON sales_commission_settlements (period_year, period_month);
CREATE INDEX idx_sales_comm_status ON sales_commission_settlements (status);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON sales_commission_settlements
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


CREATE TABLE sales_commission_lines (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id      UUID NOT NULL REFERENCES sales_commission_settlements(id) ON DELETE CASCADE,

    source_type        VARCHAR(30) NOT NULL,   -- ENROLLMENT | DIPLOMA_ENROLLMENT | BOOK_SALE
    source_id          UUID NOT NULL,

    -- Snapshots legibles: la línea tiene que seguir leyéndose aunque después
    -- cambien el nombre del alumno o el del producto.
    student_name       VARCHAR(300),
    product_name       VARCHAR(300),

    sale_date          DATE NOT NULL,
    sale_month_rank    INTEGER,                -- NULL para libros sueltos (no rankean)
    rate_applied       NUMERIC(6,5) NOT NULL,
    collected_amount   NUMERIC(14,2) NOT NULL, -- cobrado DENTRO del período liquidado
    commission_amount  NUMERIC(14,2) NOT NULL,
    from_prior_period  BOOLEAN NOT NULL DEFAULT false,

    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_sales_comm_line_source CHECK (
        source_type IN ('ENROLLMENT','DIPLOMA_ENROLLMENT','BOOK_SALE')),
    CONSTRAINT ck_sales_comm_line_rank CHECK (sale_month_rank IS NULL OR sale_month_rank >= 1),
    CONSTRAINT ck_sales_comm_line_amounts CHECK (
        collected_amount >= 0 AND commission_amount >= 0
        AND rate_applied >= 0 AND rate_applied <= 1)
);

CREATE INDEX idx_sales_comm_lines_settlement ON sales_commission_lines (settlement_id);
CREATE INDEX idx_sales_comm_lines_source     ON sales_commission_lines (source_type, source_id);

COMMENT ON TABLE  sales_commission_settlements IS
    'Liquidación mensual de comisiones de vendedora. Fórmula verificada contra la planilla de junio-2026 (doc 17 §3.1).';
COMMENT ON COLUMN sales_commission_settlements.total_commission IS
    'Único punto de redondeo: suma de las líneas SIN redondear, redondeada una sola vez (HALF_UP).';
COMMENT ON COLUMN sales_commission_lines.sale_month_rank IS
    'Posición de la venta dentro de su mes de ORIGEN. Fija la alícuota para todas sus cuotas futuras.';
