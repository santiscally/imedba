-- =============================================================================
-- V033 — Persistir InstallmentDistribution en enrollments + habilitar múltiples
-- BudgetEntry por Payment (correcciones docx Jaque 2026-07-20 §Presupuesto).
--
-- Cambios:
-- 1) enrollments.distribution_mode: hasta ahora se usaba sólo en tiempo de
--    creación para generar el cronograma; no se persistía. Necesario para saber
--    cómo separar los ingresos por concepto al cobrar una cuota (curso vs libros).
--    Default 'SEPARATE' (matrícula aparte, curso a cuotas, libros a book_sales).
--
-- 2) Se dropea uk_budget_payment_unique (1 Payment → 1 BudgetEntry) para
--    permitir múltiples asientos por pago (curso + libros separados). Se
--    reemplaza por un índice UNIQUE compuesto por (payment_id, category) que
--    sigue previniendo duplicados exactos dentro del auto-link.
-- =============================================================================

ALTER TABLE enrollments
    ADD COLUMN distribution_mode VARCHAR(20) NOT NULL DEFAULT 'SEPARATE';

ALTER TABLE enrollments
    ADD CONSTRAINT chk_enrollments_distribution_mode
    CHECK (distribution_mode IN ('SEPARATE', 'TOTAL', 'COURSE_AND_FEE'));

DROP INDEX IF EXISTS uk_budget_payment_unique;

CREATE UNIQUE INDEX uk_budget_payment_category ON budget_entries (payment_id, category)
    WHERE payment_id IS NOT NULL;
