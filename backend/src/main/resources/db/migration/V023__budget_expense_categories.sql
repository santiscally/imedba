-- Categorías de egreso por área (reunión IMEDBA 2026-06-05, Nico).
-- Postgres no permite extender un CHECK in-place: se dropea y recrea.
ALTER TABLE budget_entries DROP CONSTRAINT IF EXISTS ck_budget_category;

ALTER TABLE budget_entries
    ADD CONSTRAINT ck_budget_category CHECK (category IN (
        'FIXED', 'VARIABLE', 'MAINTENANCE',
        'INCOME_SALES', 'INCOME_ENROLLMENT', 'INCOME_OTHER',
        'SALARIES', 'SUPPLIERS', 'TEACHERS', 'ADVERTISING', 'OFFICE',
        'TRAVEL', 'EDITORIAL_COSTS', 'SUBSCRIPTIONS', 'TAXES', 'BANK_FEES',
        'OTHER'
    ));
