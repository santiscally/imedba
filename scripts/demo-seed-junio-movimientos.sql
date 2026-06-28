-- ============================================================================
-- DEMO ONLY — movimientos del mes corriente (junio 2026) para el dashboard:
--   • Ventas de libros (book_sales) → autocrean INCOME en budget_entries
--     y se ven en "Libro top del mes" del dashboard.
--   • Egresos del mes (SALARIES, ADVERTISING, OFFICE, TAXES, …) para que
--     el chip "Egresos" del filtro de Presupuesto deje de mostrar vacío.
--   • Algunos INCOME extra (donaciones / dictados particulares) para variedad.
-- Idempotente: usa concept como clave alternativa para no duplicar.
-- Aplicar:  docker compose exec -T db psql -U imedba -d imedba < scripts/demo-seed-junio-movimientos.sql
-- ============================================================================

BEGIN;

-- ─── VENTAS DE LIBROS (junio 2026) ──────────────────────────────────────────
-- Inserta book_sales reales + sus budget_entries asociadas con book_sale_id
-- (espejando lo que hace BookSaleService.create() en el back).
DO $$
DECLARE
    v_book RECORD;
    v_sale_id UUID;
    v_qty INTEGER;
    v_sale_date TIMESTAMPTZ;
    v_total NUMERIC(12,2);
BEGIN
    -- Para cada libro, generar entre 1 y 4 ventas en junio, fechas dispersas
    FOR v_book IN
        SELECT id, name, sale_price FROM books WHERE deleted_at IS NULL AND sale_price > 0 ORDER BY name
    LOOP
        FOR i IN 1..(1 + (random() * 3)::int) LOOP
            v_qty := 1 + (random() * 2)::int;
            v_sale_date := timestamp '2026-06-01 10:00:00' + (random() * interval '11 days');
            v_total := v_book.sale_price * v_qty;
            v_sale_id := gen_random_uuid();

            -- No duplicar si por casualidad ya hay una venta idéntica
            IF NOT EXISTS (
                SELECT 1 FROM book_sales bs
                WHERE bs.book_id = v_book.id AND bs.sale_date::date = v_sale_date::date AND bs.quantity = v_qty
            ) THEN
                INSERT INTO book_sales (id, book_id, quantity, unit_price, is_student_sale, total_amount, sale_date, notes)
                VALUES (v_sale_id, v_book.id, v_qty, v_book.sale_price, false, v_total, v_sale_date, 'DEMO');

                INSERT INTO budget_entries (entry_type, category, subcategory, business_unit, concept,
                                            amount, entry_date, period_month, period_year, book_sale_id)
                VALUES ('INCOME', 'INCOME_SALES', 'Venta libro', 'EDITORIAL',
                        'Venta libro ' || v_book.name,
                        v_total, v_sale_date::date,
                        EXTRACT(MONTH FROM v_sale_date)::int,
                        EXTRACT(YEAR FROM v_sale_date)::int,
                        v_sale_id);
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- ─── EGRESOS DEL MES (variedad de categorías) ───────────────────────────────
INSERT INTO budget_entries (entry_type, category, subcategory, business_unit, concept,
                             amount, entry_date, period_month, period_year,
                             payment_method, is_recurring, is_cash, is_projected)
SELECT * FROM (VALUES
    ('EXPENSE', 'SALARIES',        'Sueldo junio',       'GENERAL',    'Sueldo Marcela Heres',                850000, DATE '2026-06-05', 6, 2026, 'TRANSFERENCIA',  true,  false, false),
    ('EXPENSE', 'SALARIES',        'Sueldo junio',       'GENERAL',    'Sueldo Agustina Granada',             720000, DATE '2026-06-05', 6, 2026, 'TRANSFERENCIA',  true,  false, false),
    ('EXPENSE', 'SALARIES',        'Sueldo junio',       'GENERAL',    'Sueldo administrativa',               520000, DATE '2026-06-05', 6, 2026, 'TRANSFERENCIA',  true,  false, false),
    ('EXPENSE', 'TEACHERS',        'Honorarios docente', 'RESIDENCIAS','Honorarios docente Dr. Pereyra',      280000, DATE '2026-06-03', 6, 2026, 'TRANSFERENCIA',  false, false, false),
    ('EXPENSE', 'TEACHERS',        'Honorarios docente', 'RESIDENCIAS','Honorarios tutora Dra. Mendez',       180000, DATE '2026-06-08', 6, 2026, 'TRANSFERENCIA',  false, false, false),
    ('EXPENSE', 'ADVERTISING',     'Meta Ads',           'RESIDENCIAS','Campaña Meta Ads — captación junio',  320000, DATE '2026-06-02', 6, 2026, 'TARJETA_CREDITO',false, false, false),
    ('EXPENSE', 'ADVERTISING',     'Google Ads',         'RESIDENCIAS','Google Ads — junio',                  140000, DATE '2026-06-02', 6, 2026, 'TARJETA_CREDITO',false, false, false),
    ('EXPENSE', 'OFFICE',          'Alquiler',           'GENERAL',    'Alquiler oficina junio',              480000, DATE '2026-06-01', 6, 2026, 'TRANSFERENCIA',  true,  false, false),
    ('EXPENSE', 'OFFICE',          'Servicios',          'GENERAL',    'Luz + internet + telefonía',           65000, DATE '2026-06-10', 6, 2026, 'DEBITO_AUTOMATICO',true,false, false),
    ('EXPENSE', 'SUBSCRIPTIONS',   'Software',           'GENERAL',    'Suscripción Zoom + Drive',             32000, DATE '2026-06-06', 6, 2026, 'TARJETA_CREDITO',true,  false, false),
    ('EXPENSE', 'EDITORIAL_COSTS', 'Impresión',          'EDITORIAL',  'Impresión Pediatría — 50 ej.',        350000, DATE '2026-06-04', 6, 2026, 'TRANSFERENCIA',  false, false, false),
    ('EXPENSE', 'TAXES',           'AFIP',               'GENERAL',    'IVA mensual',                         420000, DATE '2026-06-12', 6, 2026, 'DEBITO_AUTOMATICO',false,false, false),
    ('EXPENSE', 'BANK_FEES',       'Mercado Pago',       'GENERAL',    'Comisión Mercado Pago — junio',        38000, DATE '2026-06-11', 6, 2026, 'OTRO',           false, false, false),
    ('EXPENSE', 'TRAVEL',          'Viáticos',           'RESIDENCIAS','Viáticos Nico (visita Córdoba)',       65000, DATE '2026-06-07', 6, 2026, 'EFECTIVO',       false, true,  false)
) AS v(entry_type, category, subcategory, business_unit, concept, amount, entry_date, period_month, period_year, payment_method, is_recurring, is_cash, is_projected)
WHERE NOT EXISTS (
    SELECT 1 FROM budget_entries b
    WHERE b.concept = v.concept AND b.period_year = v.period_year AND b.period_month = v.period_month
);

-- ─── INGRESOS EXTRA (no auto-generados) ─────────────────────────────────────
INSERT INTO budget_entries (entry_type, category, subcategory, business_unit, concept,
                             amount, entry_date, period_month, period_year,
                             payment_method, is_recurring, is_cash, is_projected)
SELECT * FROM (VALUES
    ('INCOME', 'INCOME_OTHER', 'Curso particular', 'RESIDENCIAS', 'Curso particular Dr. López',  180000, DATE '2026-06-08', 6, 2026, 'TRANSFERENCIA', false, false, false),
    ('INCOME', 'INCOME_OTHER', 'Convenio',         'GENERAL',     'Convenio Hospital Italiano',  450000, DATE '2026-06-04', 6, 2026, 'TRANSFERENCIA', false, false, false),
    ('INCOME', 'INCOME_OTHER', 'Donación',         'GENERAL',     'Donación anónima',             80000, DATE '2026-06-09', 6, 2026, 'EFECTIVO',      false, true,  false)
) AS v(entry_type, category, subcategory, business_unit, concept, amount, entry_date, period_month, period_year, payment_method, is_recurring, is_cash, is_projected)
WHERE NOT EXISTS (
    SELECT 1 FROM budget_entries b
    WHERE b.concept = v.concept AND b.period_year = v.period_year AND b.period_month = v.period_month
);

COMMIT;

-- ─── VERIFICACIÓN ───────────────────────────────────────────────────────────
SELECT '=== TOTALES JUNIO 2026 ===' AS info;
SELECT entry_type, COUNT(*) AS movimientos, SUM(amount) AS total
FROM budget_entries WHERE period_year = 2026 AND period_month = 6
GROUP BY entry_type ORDER BY entry_type;

SELECT '=== VENTAS DE LIBROS JUNIO 2026 (libro top del dashboard) ===' AS info;
SELECT b.name, COUNT(*) AS ventas, SUM(bs.quantity) AS unidades, SUM(bs.total_amount) AS total
FROM book_sales bs JOIN books b ON bs.book_id = b.id
WHERE bs.sale_date >= DATE '2026-06-01' AND bs.sale_date < DATE '2026-07-01'
GROUP BY b.name ORDER BY unidades DESC;
