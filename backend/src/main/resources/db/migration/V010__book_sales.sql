-- =============================================================================
-- V010 — Ventas de libros.
--
-- is_student_sale=true indica que el descuento de alumno se aplicó. La lógica
-- de 30% vive en el servicio; acá sólo persistimos el resultado.
-- total_amount = unit_price * quantity (unit_price ya trae el descuento si
-- aplicase) — se persiste para evitar recalcular en reports.
-- student_id/enrollment_id son opcionales: una venta puede no estar atada a
-- ningún alumno (venta al público).
-- =============================================================================

CREATE TABLE book_sales (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id           UUID NOT NULL REFERENCES books(id),
    student_id        UUID REFERENCES students(id),
    enrollment_id     UUID REFERENCES enrollments(id),
    quantity          INTEGER NOT NULL DEFAULT 1,
    unit_price        NUMERIC(12,2) NOT NULL,
    is_student_sale   BOOLEAN NOT NULL DEFAULT false,
    total_amount      NUMERIC(12,2) NOT NULL,
    sale_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sold_by           UUID,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_book_sales_quantity CHECK (quantity > 0),
    CONSTRAINT ck_book_sales_unit_price CHECK (unit_price >= 0),
    CONSTRAINT ck_book_sales_total CHECK (total_amount >= 0)
);

CREATE INDEX idx_book_sales_book        ON book_sales (book_id);
CREATE INDEX idx_book_sales_student     ON book_sales (student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_book_sales_enrollment  ON book_sales (enrollment_id) WHERE enrollment_id IS NOT NULL;
CREATE INDEX idx_book_sales_date        ON book_sales (sale_date DESC);
CREATE INDEX idx_book_sales_sold_by     ON book_sales (sold_by) WHERE sold_by IS NOT NULL;
