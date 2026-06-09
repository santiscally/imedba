-- Colecciones de libros (reunión IMEDBA 2026-06-05).
-- Una colección = lista de libros + variante (anillada/tradicional) + precio de lista.
CREATE TABLE collections (
    id                   UUID PRIMARY KEY,
    name                 VARCHAR(200) NOT NULL,
    variant              VARCHAR(20)  NOT NULL,
    price                NUMERIC(12,2) NOT NULL,
    student_discount_pct NUMERIC(5,2)  NOT NULL DEFAULT 35.00,
    is_active            BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ,
    created_by           UUID,
    deleted_at           TIMESTAMPTZ,
    CONSTRAINT chk_collections_variant CHECK (variant IN ('TRADICIONAL', 'ANILLADA'))
);

-- Libros que componen cada colección (M:N).
CREATE TABLE collection_books (
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    book_id       UUID NOT NULL REFERENCES books(id),
    PRIMARY KEY (collection_id, book_id)
);

CREATE INDEX idx_collection_books_book ON collection_books(book_id);
