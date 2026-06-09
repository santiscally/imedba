-- El medio de pago de una inscripción se registra en la cuota/pago (Payment),
-- no en la inscripción (reunión IMEDBA 2026-06-08).
ALTER TABLE enrollments DROP COLUMN IF EXISTS payment_method;
