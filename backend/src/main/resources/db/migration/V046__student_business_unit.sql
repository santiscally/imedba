-- Unidad de alta del alumno (docx 2026-09-24): separa los listados RM/FS y define qué datos se le piden.
ALTER TABLE students ADD COLUMN business_unit VARCHAR(30);

UPDATE students s
   SET business_unit = 'FORMACION_SUPERIOR'
 WHERE EXISTS (SELECT 1 FROM enrollments e JOIN courses c ON c.id = e.course_id
                WHERE e.student_id = s.id AND e.deleted_at IS NULL
                  AND c.business_unit = 'FORMACION_SUPERIOR')
   AND NOT EXISTS (SELECT 1 FROM enrollments e JOIN courses c ON c.id = e.course_id
                    WHERE e.student_id = s.id AND e.deleted_at IS NULL
                      AND c.business_unit = 'RESIDENCIAS');

UPDATE students SET business_unit = 'RESIDENCIAS' WHERE business_unit IS NULL;

ALTER TABLE students ALTER COLUMN business_unit SET NOT NULL;
ALTER TABLE students ADD CONSTRAINT ck_students_business_unit
    CHECK (business_unit IN ('RESIDENCIAS', 'FORMACION_SUPERIOR'));

CREATE INDEX idx_students_business_unit ON students (business_unit) WHERE deleted_at IS NULL;
