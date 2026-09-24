-- Inicio y cierre del curso: van al contrato del alumno (hasta ahora salía "A confirmar").
ALTER TABLE courses ADD COLUMN start_date DATE;
ALTER TABLE courses ADD COLUMN end_date DATE;

ALTER TABLE courses ADD CONSTRAINT ck_courses_dates
    CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);
