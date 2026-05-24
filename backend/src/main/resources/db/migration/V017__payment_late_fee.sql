-- =============================================================================
-- V017 — Pagos: recargo manual por mora.
-- Pedido en reunión IMEDBA 2026-05-22 (ver 08-requerimientos-reunion-20260522.md §2.4).
--
-- Hoy `amount` registra el monto cobrado nominal de la cuota. Cuando el alumno
-- paga después del día 10 hay un recargo del ~5% que la vendedora aplica MANUAL
-- (Nico 33:06: "como queso cuando le cobré a este porque pagó después del diente
-- pagó un 5% más y poder tenerlo registrado eso").
--
-- Total cobrado = amount + late_fee_amount.
-- Recargo separado para poder reportarlo (no diluido en `amount`).
-- =============================================================================

ALTER TABLE payments
    ADD COLUMN late_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE payments
    ADD CONSTRAINT ck_payments_late_fee CHECK (late_fee_amount >= 0);
