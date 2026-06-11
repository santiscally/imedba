-- =============================================================================
-- V028 — % de venta destinado a autorías ("pool"), configurable por libro.
--
-- Reunión 22-05 (doc 08 §2.8) + 05-06 (doc 09 §3.4): el pago a autoras es el
-- 10% del precio de venta de cada libro; los royalty_percentage de
-- book_authors reparten ESE 10% (suman 100 por libro), no la venta entera.
-- Hasta ahora el motor aplicaba el % directo sobre la venta (10x de más).
-- =============================================================================

ALTER TABLE books
    ADD COLUMN royalty_pool_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00;

ALTER TABLE books
    ADD CONSTRAINT ck_books_royalty_pool
        CHECK (royalty_pool_pct >= 0 AND royalty_pool_pct <= 100);
