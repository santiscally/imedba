-- Cuotas canceladas: al cancelar una inscripción, sus cuotas PENDING/OVERDUE pasan a
-- CANCELLED para que no figuren como deuda ni reciban recargo (testeo integral 2026-06-09).
ALTER TABLE installments DROP CONSTRAINT ck_installments_status;
ALTER TABLE installments ADD CONSTRAINT ck_installments_status
    CHECK (status::text = ANY (ARRAY[
        'PENDING'::character varying,
        'PAID'::character varying,
        'OVERDUE'::character varying,
        'CANCELLED'::character varying
    ]::text[]));
