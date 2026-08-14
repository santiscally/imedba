-- =============================================================================
-- V038 — Liquidación de diplomatura (PREMA): fórmula correcta.
--
-- El motor anterior NO coincidía con cómo IMEDBA liquida realmente. Fuente:
-- `liquidaciones-especificacion-20260724.docx` + reunión 2026-07-24 (16:10-17:18).
--
-- FÓRMULA CORRECTA
--   BASE        = total cobrado del mes
--   impuestos   = BASE × pct_impuestos_y_gastos_bancarios     [%, PRIMER descuento]
--   SUBTOTAL_1  = BASE − impuestos                             («verde» en la planilla)
--   SUBTOTAL_2  = SUBTOTAL_1 − SECRETARIA − PUBLICIDAD
--                            − ADMINISTRACION − GASTOS_VARIOS  («naranja», 4 MONTOS FIJOS)
--   MITAD       = SUBTOTAL_2 / 2
--     rama directoras: (MITAD − grabaciones_docentes) / n_directoras
--     rama empresa:    MITAD × 80% = ganancia IMEDBA
--                      MITAD × 20% = acumulado UNTREF
--
-- QUÉ ESTABA MAL ANTES
--   1. No existía el split 50/50 del subtotal 2 — el corazón del cálculo.
--   2. Faltaba GASTOS VARIOS.
--   3. Faltaba el descuento de grabaciones docentes (sale sólo de la mitad de
--      las directoras, no del total).
--   4. `admin` se aplicaba como PORCENTAJE cuando es un monto fijo.
--   5. universidad e IMEDBA se calculaban como % de `remaining1` cuando en
--      realidad son 20/80 de la MITAD que no va a las directoras.
--   6. Las directoras repartían por un `pct` configurado por cabeza; en realidad
--      se dividen la mitad en PARTES IGUALES.
--
-- CAMBIOS DE MODELO
--   - `diplomas` deja de tener costos y porcentajes: TODO va en la liquidación
--     (decisión 2026-05-22 §2.6, reconfirmada el 2026-07-23: "al crear la
--     diplomatura pide el % de la directora, eso habría que sacarlo").
--   - Las directoras salen de Personal Académico (`staff` con staff_type
--     DIRECTORA, V037) vía la tabla nueva `diploma_directors`.
--
-- NOTA SOBRE DATOS EXISTENTES: las liquidaciones ya cargadas se calcularon con
-- la fórmula equivocada, así que sus importes no significan nada bajo el modelo
-- nuevo. No se migran: quedan con los campos nuevos en 0 y hay que regenerarlas.
-- Acordado con el cliente el 2026-07-30 (los datos se recargan de cero).
-- =============================================================================

-- ─── 1) diplomas: fuera costos y porcentajes ────────────────────────────────
ALTER TABLE diplomas
    DROP CONSTRAINT IF EXISTS ck_diplomas_pcts,
    DROP CONSTRAINT IF EXISTS ck_diplomas_fixed;

ALTER TABLE diplomas
    DROP COLUMN IF EXISTS tax_commission_pct,
    DROP COLUMN IF EXISTS secretary_salary,
    DROP COLUMN IF EXISTS advertising_amount,
    DROP COLUMN IF EXISTS admin_pct,
    DROP COLUMN IF EXISTS university_pct,
    DROP COLUMN IF EXISTS imedba_pct,
    DROP COLUMN IF EXISTS partners_config;


-- ─── 2) Directoras de la diplomatura (desde Personal Académico) ─────────────
CREATE TABLE diploma_directors (
    diploma_id  UUID NOT NULL REFERENCES diplomas(id) ON DELETE CASCADE,
    staff_id    UUID NOT NULL REFERENCES staff(id),
    PRIMARY KEY (diploma_id, staff_id)
);

CREATE INDEX idx_diploma_directors_staff ON diploma_directors (staff_id);

COMMENT ON TABLE diploma_directors IS
    'Directoras de la diplomatura. Sin porcentaje: se reparten en partes iguales la mitad del subtotal 2 menos grabaciones.';


-- ─── 3) diploma_settlements: inputs y resultados de la fórmula nueva ────────
ALTER TABLE diploma_settlements
    DROP CONSTRAINT IF EXISTS ck_settlement_admin_pct,
    DROP CONSTRAINT IF EXISTS ck_settlement_univ_pct,
    DROP CONSTRAINT IF EXISTS ck_settlement_imed_pct;

ALTER TABLE diploma_settlements
    DROP COLUMN IF EXISTS input_admin_pct,
    DROP COLUMN IF EXISTS input_university_pct;

-- Inputs (los carga el usuario al liquidar)
ALTER TABLE diploma_settlements
    ADD COLUMN IF NOT EXISTS input_administration_amount NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS input_misc_expenses_amount  NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS input_recordings_amount     NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS input_untref_pct            NUMERIC(5,2);

ALTER TABLE diploma_settlements
    ALTER COLUMN input_imedba_pct SET DEFAULT 80;

-- Resultados calculados (se persisten para poder auditar cada paso)
ALTER TABLE diploma_settlements
    ADD COLUMN IF NOT EXISTS subtotal_1             NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS administration_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS misc_expenses_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS subtotal_2             NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS half_amount            NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS recordings_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS directors_base_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS untref_amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS directors_distribution JSONB NOT NULL DEFAULT '[]'::jsonb;

-- `admin_amount` pasa de ser "remaining1 × admin_pct" a ser el monto fijo cargado.
-- Se renombra para que ningún lector viejo lo confunda con el cálculo anterior.
ALTER TABLE diploma_settlements DROP COLUMN IF EXISTS admin_amount;

-- `university_amount` era % de remaining1; ahora la porción de UNTREF vive en
-- `untref_amount`. Se descarta la vieja para no dejar dos fuentes de verdad.
ALTER TABLE diploma_settlements DROP COLUMN IF EXISTS university_amount;

-- Las socias con porcentaje propio ya no existen: las directoras van en partes
-- iguales y el snapshot queda en `directors_distribution`.
ALTER TABLE diploma_settlements DROP COLUMN IF EXISTS partners_total;
ALTER TABLE diploma_settlements DROP COLUMN IF EXISTS partners_distribution;

ALTER TABLE diploma_settlements
    ADD CONSTRAINT ck_settlement_untref_pct CHECK (
        input_untref_pct IS NULL OR input_untref_pct BETWEEN 0 AND 100),
    ADD CONSTRAINT ck_settlement_imedba_pct_v2 CHECK (
        input_imedba_pct IS NULL OR input_imedba_pct BETWEEN 0 AND 100),
    ADD CONSTRAINT ck_settlement_fixed_amounts CHECK (
        (input_administration_amount IS NULL OR input_administration_amount >= 0)
        AND (input_misc_expenses_amount IS NULL OR input_misc_expenses_amount >= 0)
        AND (input_recordings_amount    IS NULL OR input_recordings_amount    >= 0));

COMMENT ON COLUMN diploma_settlements.subtotal_1 IS
    'Cobrado menos impuestos y gastos bancarios («verde» en la planilla de IMEDBA).';
COMMENT ON COLUMN diploma_settlements.subtotal_2 IS
    'Subtotal 1 menos los 4 gastos administrativos fijos («naranja»). Se parte 50/50.';
COMMENT ON COLUMN diploma_settlements.half_amount IS
    'Mitad del subtotal 2. Una mitad va a directoras (menos grabaciones), la otra se reparte 80/20 entre IMEDBA y UNTREF.';
COMMENT ON COLUMN diploma_settlements.recordings_amount IS
    'Grabaciones docentes: se descuenta SOLO de la mitad de las directoras, no del total.';
COMMENT ON COLUMN diploma_settlements.untref_amount IS
    'Porción de UNTREF. No se paga mensualmente: se acumula y se salda al cerrar la comisión.';
