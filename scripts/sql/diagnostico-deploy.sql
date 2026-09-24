-- Diagnóstico de datos, sólo lectura: correrlo antes y después de cada deploy (ver README, "Base de datos en el deploy").
\pset footer off

\echo '== 1. Cursos FS sin diplomatura (V047 los cuelga de su diplomatura; después del deploy tiene que dar 0)'
SELECT c.id, c.name, c.commission,
       (SELECT count(*) FROM enrollments e WHERE e.course_id = c.id AND e.deleted_at IS NULL) AS inscripciones
  FROM courses c
 WHERE c.business_unit = 'FORMACION_SUPERIOR' AND c.diploma_id IS NULL AND c.deleted_at IS NULL
 ORDER BY c.name;

\echo '== 2. Comisiones sin número (completar editando la comisión en Diplomaturas)'
SELECT d.name AS diplomatura, c.id AS curso_id, c.name AS curso
  FROM courses c
  JOIN diplomas d ON d.id = c.diploma_id
 WHERE c.commission IS NULL AND c.deleted_at IS NULL
 ORDER BY d.name;

\echo '== 3. Diplomaturas que parecen el mismo programa (posibles duplicados por comisión: unificar a mano)'
SELECT lower(btrim(regexp_replace(d.name, '\s*[—–·-]?\s*\m(comisi[oó]n|com\.?)\s*\d+\s*$', '', 'i'))) AS programa,
       count(*) AS diplomaturas, string_agg(d.name, ' | ' ORDER BY d.name) AS nombres
  FROM diplomas d
 WHERE d.deleted_at IS NULL
 GROUP BY 1
HAVING count(*) > 1;

\echo '== 4. Cursos de Editorial o General (ya no se listan en Cursos: reclasificar a Residencias o pasar a una diplomatura)'
SELECT c.id, c.name, c.business_unit,
       (SELECT count(*) FROM enrollments e WHERE e.course_id = c.id AND e.deleted_at IS NULL) AS inscripciones
  FROM courses c
 WHERE c.business_unit IN ('EDITORIAL', 'GENERAL') AND c.deleted_at IS NULL
 ORDER BY c.name;

\echo '== 5. Cursos activos sin fecha de inicio o cierre (el contrato dice "A confirmar")'
SELECT c.business_unit, c.name, c.start_date, c.end_date
  FROM courses c
 WHERE c.deleted_at IS NULL AND c.is_active AND (c.start_date IS NULL OR c.end_date IS NULL)
 ORDER BY c.business_unit, c.name;

\echo '== 6. Libros de colecciones con precio 0 (la colección suma 0 por ese libro)'
SELECT co.name AS coleccion, co.variant, b.name AS libro, b.sale_price
  FROM collections co
  JOIN collection_books cb ON cb.collection_id = co.id
  JOIN books b ON b.id = cb.book_id
 WHERE co.deleted_at IS NULL AND b.deleted_at IS NULL AND coalesce(b.sale_price, 0) = 0
 ORDER BY co.name, co.variant, b.name;

\echo '== 7. Alumnos inscriptos en las dos unidades (aparecen en los dos listados; es esperado)'
SELECT s.last_name, s.first_name, s.email, s.business_unit AS unidad_de_alta
  FROM students s
 WHERE s.deleted_at IS NULL
   AND EXISTS (SELECT 1 FROM enrollments e JOIN courses c ON c.id = e.course_id
                WHERE e.student_id = s.id AND e.deleted_at IS NULL AND c.business_unit = 'RESIDENCIAS')
   AND EXISTS (SELECT 1 FROM enrollments e JOIN courses c ON c.id = e.course_id
                WHERE e.student_id = s.id AND e.deleted_at IS NULL AND c.business_unit = 'FORMACION_SUPERIOR')
 ORDER BY s.last_name, s.first_name;
