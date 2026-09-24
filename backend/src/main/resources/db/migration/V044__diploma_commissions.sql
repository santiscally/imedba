-- Cada comisión de una diplomatura es un curso FS que cuelga de ella; reemplaza el vínculo 1:1 de diplomas.course_id.
ALTER TABLE courses ADD COLUMN diploma_id UUID REFERENCES diplomas (id);

CREATE INDEX idx_courses_diploma ON courses (diploma_id) WHERE deleted_at IS NULL;

UPDATE courses c
   SET diploma_id = d.id
  FROM diplomas d
 WHERE d.course_id = c.id;
