-- ============================================================================
-- DEMO ONLY — script de inserts/updates para que la demo del 12-jun tenga
-- precios de libros/colecciones y cuotas vencidas visibles en el dashboard.
-- NO es seed de producción ni migración Flyway. Se corre a mano contra una DB
-- de desarrollo: docker compose exec -T db psql -U imedba -d imedba < scripts/demo-seed-prices-overdue.sql
-- ============================================================================

BEGIN;

-- ─── PRECIOS Y STOCK PARA LOS 7 LIBROS V029 ─────────────────────────────────
UPDATE books SET sale_price = 35000.00, stock_quantity = 50 WHERE name = 'Pediatría'                  AND deleted_at IS NULL;
UPDATE books SET sale_price = 42000.00, stock_quantity = 50 WHERE name = 'Cirugía'                    AND deleted_at IS NULL;
UPDATE books SET sale_price = 38000.00, stock_quantity = 50 WHERE name = 'Ginecología'                AND deleted_at IS NULL;
UPDATE books SET sale_price = 45000.00, stock_quantity = 40 WHERE name = 'Medicina Interna Vol. I'    AND deleted_at IS NULL;
UPDATE books SET sale_price = 45000.00, stock_quantity = 40 WHERE name = 'Medicina Interna Vol. II'   AND deleted_at IS NULL;
UPDATE books SET sale_price = 32000.00, stock_quantity = 60 WHERE name = 'Medicina Familiar'          AND deleted_at IS NULL;
UPDATE books SET sale_price = 48000.00, stock_quantity = 30 WHERE name = 'Especialidades Quirúrgicas' AND deleted_at IS NULL;

-- ─── PRECIOS PARA LAS 2 COLECCIONES (bundle con leve descuento sobre la suma) ─
UPDATE collections SET price = 250000.00 WHERE variant = 'TRADICIONAL' AND deleted_at IS NULL;
UPDATE collections SET price = 260000.00 WHERE variant = 'ANILLADA'    AND deleted_at IS NULL;

-- ─── CUOTAS VENCIDAS PARA EL DASHBOARD ──────────────────────────────────────
-- (a) Backdate de las 3 OVERDUE actuales (hoy ~2-7 días, el dashboard exige > 10)
UPDATE installments
SET due_date = due_date - INTERVAL '30 days'
WHERE status = 'OVERDUE';

-- (b) Convertir 3 PENDING en OVERDUE con fechas viejas + recargo 5%
--     Elijo cuotas de distintos alumnos para que el dashboard muestre variedad.

-- Bek cuota 2 — 38 días vencida
UPDATE installments
SET due_date         = DATE '2026-05-05',
    status           = 'OVERDUE',
    surcharge_amount = ROUND(amount * 0.05, 2)
WHERE id = (
  SELECT i.id FROM installments i
  JOIN enrollments e ON i.enrollment_id = e.id
  JOIN students s    ON e.student_id    = s.id
  WHERE s.last_name = 'Bek' AND i.number = 2 AND i.status = 'PENDING'
  LIMIT 1
);

-- Donald cuota 2 — 23 días vencida
UPDATE installments
SET due_date         = DATE '2026-05-20',
    status           = 'OVERDUE',
    surcharge_amount = ROUND(amount * 0.05, 2)
WHERE id = (
  SELECT i.id FROM installments i
  JOIN enrollments e ON i.enrollment_id = e.id
  JOIN students s    ON e.student_id    = s.id
  WHERE s.last_name = 'Donald' AND i.number = 2 AND i.status = 'PENDING'
  LIMIT 1
);

-- Lepeu cuota 2 — 48 días vencida (más vieja, queda arriba en el ranking del dashboard)
UPDATE installments
SET due_date         = DATE '2026-04-25',
    status           = 'OVERDUE',
    surcharge_amount = ROUND(amount * 0.05, 2)
WHERE id = (
  SELECT i.id FROM installments i
  JOIN enrollments e ON i.enrollment_id = e.id
  JOIN students s    ON e.student_id    = s.id
  WHERE s.last_name = 'Lepeu' AND i.number = 2 AND i.status = 'PENDING'
  LIMIT 1
);

COMMIT;

-- ─── VERIFICACIÓN ───────────────────────────────────────────────────────────
SELECT '=== LIBROS ===' AS info;
SELECT name, sale_price, stock_quantity FROM books WHERE deleted_at IS NULL ORDER BY name;

SELECT '=== COLECCIONES ===' AS info;
SELECT name, variant, price FROM collections WHERE deleted_at IS NULL ORDER BY variant;

SELECT '=== CUOTAS OVERDUE (lo que verá el dashboard) ===' AS info;
SELECT s.last_name AS alumno, c.name AS curso, i.number AS cuota,
       i.amount, i.surcharge_amount, i.due_date,
       (CURRENT_DATE - i.due_date) AS dias_vencidos
FROM installments i
JOIN enrollments e ON i.enrollment_id = e.id
JOIN students s    ON e.student_id    = s.id
JOIN courses   c   ON e.course_id     = c.id
WHERE i.status = 'OVERDUE'
ORDER BY (CURRENT_DATE - i.due_date) DESC;
