-- Ciclo lectivo / año del curso (reunión IMEDBA 2026-06-05 §3.7, Nico ~09:42:
-- "agrupar cursos por ciclo lectivo / año — sería un golazo"). Los cursos son
-- anuales; algunos ("libre"/básico de Residencias) no llevan año → nullable.
ALTER TABLE courses
    ADD COLUMN academic_year INTEGER;

-- Índice para filtrar/agrupar por ciclo lectivo en el listado.
CREATE INDEX idx_courses_academic_year ON courses (academic_year);
