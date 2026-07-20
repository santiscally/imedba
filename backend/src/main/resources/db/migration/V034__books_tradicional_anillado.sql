-- =============================================================================
-- V034 — Stock separado por formato tradicional vs anillado (docx Jaque
-- 2026-07-20 §Editorial). Cada uno de los 7 libros existentes queda como
-- TRADICIONAL y se crea un gemelo ANILLADO con:
--   - mismo name (+ sufijo " (Anillada)")
--   - mismo edition, specialty, pages, sale_price, cost_per_unit,
--     student_discount_pct, royalty_pool_pct
--   - stock_quantity inicial en 0 (se ajusta por IMEDBA)
--   - las mismas book_authors con sus %
--   - code sufijado con "-A" si el tradicional tenía code
--
-- La Colección "Colección Residencias · ANILLADA" se reconecta a los libros
-- anillados (antes apuntaba a los tradicionales por falta de la variante).
--
-- Idempotente: si el gemelo ya existe (por name) no lo duplica; si la Collection
-- ya apunta al anillado, no reconecta.
-- =============================================================================

-- 1) Setear format = 'TRADICIONAL' en los libros existentes que no lo tengan
UPDATE books
   SET format = 'TRADICIONAL'
 WHERE deleted_at IS NULL
   AND (format IS NULL OR format = '' OR format NOT IN ('TRADICIONAL', 'ANILLADO'));

-- 2) Crear el gemelo ANILLADO para cada libro TRADICIONAL que aún no lo tenga
INSERT INTO books (
    name, code, specialty, format, edition, pages,
    sale_price, student_discount_pct, royalty_pool_pct,
    cost_per_unit, stock_quantity, branch, is_active
)
SELECT
    b.name || ' (Anillada)',
    CASE WHEN b.code IS NULL OR b.code = '' THEN NULL ELSE b.code || '-A' END,
    b.specialty,
    'ANILLADO',
    b.edition,
    b.pages,
    b.sale_price,
    b.student_discount_pct,
    b.royalty_pool_pct,
    b.cost_per_unit,
    0,               -- stock inicial 0 (IMEDBA ajusta)
    b.branch,
    b.is_active
  FROM books b
 WHERE b.deleted_at IS NULL
   AND b.format = 'TRADICIONAL'
   AND NOT EXISTS (
       SELECT 1 FROM books a
        WHERE a.deleted_at IS NULL
          AND a.format = 'ANILLADO'
          AND a.name = b.name || ' (Anillada)'
   );

-- 3) Copiar book_authors del tradicional al anillado
INSERT INTO book_authors (book_id, author_id, royalty_percentage)
SELECT anillado.id, ba.author_id, ba.royalty_percentage
  FROM books tradicional
  JOIN books anillado
    ON anillado.name = tradicional.name || ' (Anillada)'
   AND anillado.format = 'ANILLADO'
   AND anillado.deleted_at IS NULL
  JOIN book_authors ba
    ON ba.book_id = tradicional.id
 WHERE tradicional.format = 'TRADICIONAL'
   AND tradicional.deleted_at IS NULL
   AND NOT EXISTS (
       SELECT 1 FROM book_authors ba2
        WHERE ba2.book_id = anillado.id
          AND ba2.author_id = ba.author_id
   );

-- 4) Reconectar la colección "Colección Residencias · ANILLADA" a los libros
-- ANILLADO. Borro las filas viejas (apuntaban a los tradicionales) y agrego las
-- nuevas por gemelo.
DELETE FROM collection_books
 WHERE collection_id IN (
     SELECT id FROM collections
      WHERE variant = 'ANILLADA' AND name = 'Colección Residencias' AND deleted_at IS NULL
 );

INSERT INTO collection_books (collection_id, book_id)
SELECT c.id, anillado.id
  FROM collections c
  JOIN books anillado
    ON anillado.format = 'ANILLADO'
   AND anillado.deleted_at IS NULL
 WHERE c.variant = 'ANILLADA'
   AND c.name = 'Colección Residencias'
   AND c.deleted_at IS NULL
   AND NOT EXISTS (
       SELECT 1 FROM collection_books cb
        WHERE cb.collection_id = c.id AND cb.book_id = anillado.id
   );
