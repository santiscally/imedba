-- =============================================================================
-- V018 — diploma_settlements: inputs por liquidación (no por diploma).
-- Pedido en reunión IMEDBA 2026-05-22 §2.5/2.6 (Nico 43:13-44:43):
--   "los costos fijos van en la liquidación, no en la diplomatura. Publicidad
--   no es un porcentaje de nada, es lo que se gastó ese mes."
--
-- Se agregan los campos de input (porcentajes y montos cargados por el usuario
-- al crear la liquidación). Las columnas existentes en `diplomas` quedan como
-- defaults opcionales (backward compat); el cálculo prioriza los inputs por
-- settlement. Si un input es NULL, se usa el del diploma como fallback.
-- =============================================================================

ALTER TABLE diploma_settlements
    ADD COLUMN input_tax_commission_pct NUMERIC(5,2),
    ADD COLUMN input_secretary_salary   NUMERIC(12,2),
    ADD COLUMN input_advertising_amount NUMERIC(12,2),
    ADD COLUMN input_admin_pct          NUMERIC(5,2),
    ADD COLUMN input_university_pct     NUMERIC(5,2),
    ADD COLUMN input_imedba_pct         NUMERIC(5,2);

ALTER TABLE diploma_settlements
    ADD CONSTRAINT ck_settlement_tax_pct   CHECK (input_tax_commission_pct IS NULL OR input_tax_commission_pct BETWEEN 0 AND 100),
    ADD CONSTRAINT ck_settlement_admin_pct CHECK (input_admin_pct          IS NULL OR input_admin_pct          BETWEEN 0 AND 100),
    ADD CONSTRAINT ck_settlement_univ_pct  CHECK (input_university_pct     IS NULL OR input_university_pct     BETWEEN 0 AND 100),
    ADD CONSTRAINT ck_settlement_imed_pct  CHECK (input_imedba_pct         IS NULL OR input_imedba_pct         BETWEEN 0 AND 100),
    ADD CONSTRAINT ck_settlement_secsal    CHECK (input_secretary_salary   IS NULL OR input_secretary_salary   >= 0),
    ADD CONSTRAINT ck_settlement_advamt    CHECK (input_advertising_amount IS NULL OR input_advertising_amount >= 0);
