-- Cursos FS sin diplomatura (cargados desde Cursos antes de V044): se cuelgan de la diplomatura general de su programa, sin tocar inscripciones ni pagos.
CREATE TEMP TABLE fix_orphan_fs ON COMMIT DROP AS
SELECT c.id,
       COALESCE(NULLIF(btrim(regexp_replace(
           c.name, '\s*[—–·-]?\s*\m(comisi[oó]n|com\.?)\s*\d+\s*$', '', 'i')), ''), c.name) AS program
  FROM courses c
 WHERE c.business_unit = 'FORMACION_SUPERIOR'
   AND c.diploma_id IS NULL
   AND c.deleted_at IS NULL;

INSERT INTO diplomas (name, is_active)
SELECT MIN(o.program), BOOL_OR(c.is_active)
  FROM fix_orphan_fs o
  JOIN courses c ON c.id = o.id
 WHERE NOT EXISTS (SELECT 1 FROM diplomas d
                    WHERE d.deleted_at IS NULL AND lower(d.name) = lower(o.program))
 GROUP BY lower(o.program);

UPDATE courses c
   SET diploma_id = (SELECT d.id FROM diplomas d
                      WHERE d.deleted_at IS NULL AND lower(d.name) = lower(o.program)
                      ORDER BY d.created_at, d.id
                      LIMIT 1)
  FROM fix_orphan_fs o
 WHERE c.id = o.id;

-- Comisiones sin número cuyo nombre ya lo trae ("… Comisión 10"): se toma de ahí; las demás quedan en null para completarlas a mano.
UPDATE courses
   SET commission = substring(lower(name) from '\m(?:comisi[oó]n|com\.?)\s*(\d+)\s*$')::int
 WHERE diploma_id IS NOT NULL
   AND commission IS NULL
   AND deleted_at IS NULL
   AND lower(name) ~ '\m(comisi[oó]n|com\.?)\s*\d+\s*$';
