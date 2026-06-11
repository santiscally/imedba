-- =============================================================================
-- V029 — Seed del catálogo editorial real (data pasada por Nico, 2026-06-10).
--
-- Carga estructural de primera puesta en marcha: los 7 libros de Residencias,
-- las 5 autoras con su % de autoría por libro y las dos colecciones
-- (tradicional / anillada). Precios en 0: los carga IMEDBA desde el SPA.
--
-- Reparto (doc 09 §3.4: el % es sobre el pool de autorías —10% de la venta,
-- ver V028—; Jaque y Meli se parten su porción 50/50):
--   - Medicina Interna Vol. I : Heres 19 / Granada 29 / Cataldi 26 / Porporato 26
--   - Medicina Interna Vol. II: Panizza 27 / Cataldi 36.5 / Porporato 36.5
--   - Resto (5 libros)        : Cataldi 50 / Porporato 50
--
-- Idempotente: cada bloque chequea existencia por nombre, así no duplica si
-- IMEDBA ya cargó algo a mano. Si un libro ya tiene autoras vinculadas, no se
-- le agrega ninguna (se respeta lo cargado).
-- =============================================================================

-- 1) Autoras --------------------------------------------------------------
INSERT INTO authors (first_name, last_name)
SELECT v.first_name, v.last_name
FROM (VALUES
    ('Marcela',   'Heres'),
    ('Agustina',  'Granada'),
    ('Ana',       'Panizza'),
    ('Jaquelina', 'Cataldi'),
    ('Melina',    'Porporato')
) AS v(first_name, last_name)
WHERE NOT EXISTS (
    SELECT 1 FROM authors a
    WHERE a.first_name = v.first_name AND a.last_name = v.last_name
);

-- 2) Libros (precio 0: lo carga IMEDBA; pool de autorías 10% por default) --
INSERT INTO books (name, edition, sale_price)
SELECT v.name, '4ta', 0
FROM (VALUES
    ('Pediatría'),
    ('Cirugía'),
    ('Ginecología'),
    ('Medicina Interna Vol. I'),
    ('Medicina Interna Vol. II'),
    ('Medicina Familiar'),
    ('Especialidades Quirúrgicas')
) AS v(name)
WHERE NOT EXISTS (
    SELECT 1 FROM books b
    WHERE b.name = v.name AND b.deleted_at IS NULL
);

-- 3) Autorías por libro (no toca libros que ya tengan autoras vinculadas) --
INSERT INTO book_authors (book_id, author_id, royalty_percentage)
SELECT b.id, a.id, v.pct
FROM (VALUES
    ('Medicina Interna Vol. I',  'Heres',     19.00),
    ('Medicina Interna Vol. I',  'Granada',   29.00),
    ('Medicina Interna Vol. I',  'Cataldi',   26.00),
    ('Medicina Interna Vol. I',  'Porporato', 26.00),
    ('Medicina Interna Vol. II', 'Panizza',   27.00),
    ('Medicina Interna Vol. II', 'Cataldi',   36.50),
    ('Medicina Interna Vol. II', 'Porporato', 36.50),
    ('Pediatría',                'Cataldi',   50.00),
    ('Pediatría',                'Porporato', 50.00),
    ('Cirugía',                  'Cataldi',   50.00),
    ('Cirugía',                  'Porporato', 50.00),
    ('Ginecología',              'Cataldi',   50.00),
    ('Ginecología',              'Porporato', 50.00),
    ('Medicina Familiar',        'Cataldi',   50.00),
    ('Medicina Familiar',        'Porporato', 50.00),
    ('Especialidades Quirúrgicas', 'Cataldi',   50.00),
    ('Especialidades Quirúrgicas', 'Porporato', 50.00)
) AS v(book_name, author_last, pct)
JOIN books b   ON b.name = v.book_name AND b.deleted_at IS NULL
JOIN authors a ON a.last_name = v.author_last
WHERE NOT EXISTS (
    SELECT 1 FROM book_authors ba WHERE ba.book_id = b.id
);

-- 4) Colecciones: mismos 7 libros, dos variantes con precio propio ---------
INSERT INTO collections (id, name, variant, price)
SELECT gen_random_uuid(), v.name, v.variant, 0
FROM (VALUES
    ('Colección Residencias', 'TRADICIONAL'),
    ('Colección Residencias', 'ANILLADA')
) AS v(name, variant)
WHERE NOT EXISTS (
    SELECT 1 FROM collections c
    WHERE c.name = v.name AND c.variant = v.variant AND c.deleted_at IS NULL
);

INSERT INTO collection_books (collection_id, book_id)
SELECT c.id, b.id
FROM collections c
JOIN books b ON b.name IN (
    'Pediatría', 'Cirugía', 'Ginecología',
    'Medicina Interna Vol. I', 'Medicina Interna Vol. II',
    'Medicina Familiar', 'Especialidades Quirúrgicas'
) AND b.deleted_at IS NULL
WHERE c.name = 'Colección Residencias' AND c.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM collection_books cb
      WHERE cb.collection_id = c.id AND cb.book_id = b.id
  );
