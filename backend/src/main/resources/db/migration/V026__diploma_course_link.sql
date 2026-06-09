-- =============================================================================
-- V026 — diplomas.course_id: vínculo diplomatura ↔ curso.
-- Pedido del usuario 2026-06-09: "las diplomaturas deberían ser como cursos al
-- que te inscribís y creás cuotas". En vez de duplicar el flujo de inscripción,
-- la diplomatura se linkea a un Curso (unidad FORMACION_SUPERIOR): la inscripción,
-- las cuotas y los pagos pasan por el flujo de cursos ya existente.
--
-- Con el link, la liquidación puede calcular `total_collected` automáticamente:
-- suma de pagos del período de las inscripciones de ese curso (en vez del input
-- manual). Y al marcar la liquidación PAID se generan los egresos en Presupuesto.
-- =============================================================================

ALTER TABLE diplomas
    ADD COLUMN course_id UUID REFERENCES courses (id);

CREATE INDEX idx_diplomas_course ON diplomas (course_id);

COMMENT ON COLUMN diplomas.course_id IS
    'Curso (FS) por el que se inscriben los alumnos de esta diplomatura. La liquidación suma los pagos de sus inscripciones.';
