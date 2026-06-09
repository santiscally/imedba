-- Grupo de pago por inscripción (reunión IMEDBA 2026-06-05).
-- GROUP_1: cuota vence día 10, recargo día 11+. GROUP_2: vence día 20, recargo día 21+.
-- Default GROUP_1 = comportamiento histórico (vencimiento día 10).
ALTER TABLE enrollments
    ADD COLUMN payment_group VARCHAR(20) NOT NULL DEFAULT 'GROUP_1';

ALTER TABLE enrollments
    ADD CONSTRAINT chk_enrollments_payment_group
    CHECK (payment_group IN ('GROUP_1', 'GROUP_2'));
