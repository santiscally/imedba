-- =============================================================================
-- V035 — Libro PREMA + flag Course.includes_prema_book (docx Jaque 2026-07-20
-- §Editorial). PREMA es un libro nuevo que:
--   - Se incluye en el precio de la matrícula (no se cobra aparte).
--   - Se descuenta automáticamente del stock al crear una inscripción en un
--     curso cuyo flag includes_prema_book esté en true.
--   - Solo tiene formato TRADICIONAL (no hay versión anillada).
--
-- Este script sólo agrega el flag y el libro; la lógica de auto-descuento
-- vive en EnrollmentService.create() (crea un BookSale unit_price=0 cuando el
-- curso lo tenga marcado).
-- =============================================================================

ALTER TABLE courses
    ADD COLUMN includes_prema_book BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO books (name, format, edition, sale_price, stock_quantity, is_active)
SELECT 'PREMA', 'TRADICIONAL', '1ra', 0, 0, TRUE
 WHERE NOT EXISTS (
     SELECT 1 FROM books b
      WHERE b.name = 'PREMA' AND b.deleted_at IS NULL
 );
