-- =============================================================================
-- V009 — Editorial: libros, autores, y relación book_authors con % de autoría.
--
-- Decisiones de diseño (ver ERD simplificado, 02-entidad-relacion.md):
--   - specialty y format son campos VARCHAR, no tablas propias.
--   - stock es un entero plano + branch VARCHAR (no hay tabla book_stocks).
--   - student_discount_pct default 30 (% de descuento a alumnos).
--   - royalties se calculan on-the-fly sobre book_sales — no hay tabla
--     royalty_calculations.
-- =============================================================================

CREATE TABLE books (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(200) NOT NULL,
    code                    VARCHAR(20),
    specialty               VARCHAR(100),
    format                  VARCHAR(50),
    edition                 VARCHAR(50),
    pages                   INTEGER,
    sale_price              NUMERIC(12,2) NOT NULL,
    student_discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 30,
    cost_per_unit           NUMERIC(12,2),
    stock_quantity          INTEGER NOT NULL DEFAULT 0,
    branch                  VARCHAR(100),
    is_active               BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID,
    deleted_at              TIMESTAMPTZ,

    CONSTRAINT ck_books_sale_price CHECK (sale_price >= 0),
    CONSTRAINT ck_books_cost CHECK (cost_per_unit IS NULL OR cost_per_unit >= 0),
    CONSTRAINT ck_books_stock CHECK (stock_quantity >= 0),
    CONSTRAINT ck_books_discount_pct CHECK (student_discount_pct >= 0 AND student_discount_pct <= 100),
    CONSTRAINT ck_books_pages CHECK (pages IS NULL OR pages > 0)
);

CREATE INDEX idx_books_active       ON books (is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_books_specialty    ON books (specialty) WHERE deleted_at IS NULL;
CREATE INDEX idx_books_code         ON books (code) WHERE code IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_books_low_stock    ON books (stock_quantity) WHERE stock_quantity < 5 AND deleted_at IS NULL;

CREATE TRIGGER trg_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ---------------------------------------------------------------------------

CREATE TABLE authors (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(255),
    phone       VARCHAR(50),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_authors_active ON authors (is_active);
CREATE INDEX idx_authors_email  ON authors (email) WHERE email IS NOT NULL;

CREATE TRIGGER trg_authors_updated_at
    BEFORE UPDATE ON authors
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ---------------------------------------------------------------------------

CREATE TABLE book_authors (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id             UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    author_id           UUID NOT NULL REFERENCES authors(id),
    royalty_percentage  NUMERIC(5,2) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_book_authors UNIQUE (book_id, author_id),
    CONSTRAINT ck_book_authors_royalty CHECK (royalty_percentage >= 0 AND royalty_percentage <= 100)
);

CREATE INDEX idx_book_authors_book   ON book_authors (book_id);
CREATE INDEX idx_book_authors_author ON book_authors (author_id);
