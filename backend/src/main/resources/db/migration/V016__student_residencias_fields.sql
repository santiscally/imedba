-- =============================================================================
-- V016 — Alumnos: campos para flujo Residencias Médicas
-- Pedido en reunión IMEDBA 2026-05-22 (ver 08-requerimientos-reunion-20260522.md §2.1)
-- =============================================================================

-- Terminó IAR/PFO: instancia final de la carrera de Medicina.
-- Muchos alumnos arrancan el curso antes de terminarla; saberlo es orientador para Meli.
ALTER TABLE students ADD COLUMN iar_pfo_completed BOOLEAN NOT NULL DEFAULT false;

-- Lugar de residencia: dónde vive el alumno actualmente. Distinto de `nationality` y `locality`.
-- Sirve para saber si rinde el examen en Argentina o en su país (Jaque + Gustavo, min 11:38-12:20).
ALTER TABLE students ADD COLUMN residence_location VARCHAR(200);

-- Especialidad/es a la/s que se va a rendir. Lo llena el alumno, no la vendedora.
-- Texto libre por ahora (algunos alumnos se rinden a varias — separadas por coma).
ALTER TABLE students ADD COLUMN specialty VARCHAR(300);

-- Concurso/s al que se presenta. También lo llena el alumno.
ALTER TABLE students ADD COLUMN target_competition VARCHAR(300);

-- Índice opcional para filtrar por especialidad (Meli lo va a usar para reportes).
CREATE INDEX idx_students_specialty_trgm
    ON students USING gin (LOWER(specialty) gin_trgm_ops)
    WHERE deleted_at IS NULL AND specialty IS NOT NULL;
