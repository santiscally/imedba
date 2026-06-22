-- V030 — Comisión para cursos de Formación Superior (reunión 2026-06-12).
-- Para Formación Superior el "ciclo lectivo" se compone de comisión (secuencial cada
-- 6 meses; la 10 es la actual, la 11 arranca ago-2026) + año (academic_year ya existe).
-- Para Residencias queda NULL (usan solo academic_year como año).
ALTER TABLE courses ADD COLUMN commission INTEGER;

COMMENT ON COLUMN courses.commission IS 'Nro de comisión (solo Formación Superior); año en academic_year. Reunión 12-jun.';
