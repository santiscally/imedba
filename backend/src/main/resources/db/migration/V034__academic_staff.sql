-- =============================================================================
-- V034 — Personal Académico: extensión de `staff`.
--
-- Pedido escrito (`correcciones-imedba-20260723.docx`):
--   "Incluir una pestaña que sea DOCENTES y ahí cargar los datos de cada docente
--    (mail, dni, materia que da y teléfono), de paso nos sirve para conectar con
--    las distintas liquidaciones."
--
-- Generalizado por Nico en la llamada del 24-jul (23:06):
--   "quizás se puede poner como personal académico… que vos puedas poner si es
--    docente, si es tutora, si es preceptora y si es directora. Y si es de
--    residencia, si es de prema o si es de ambas."
--
-- NO es un padrón de inscripción: "no es para inscribirlos en ningún lado" (11:01).
-- Es un listado de contacto que además alimenta las liquidaciones — las directoras
-- de PREMA se cargan acá con rótulo DIRECTORA y la diplomatura las referencia, en
-- lugar de pedir un "% de directora" al crearla.
--
-- Se extiende la tabla `staff` que ya existe (V013). No se crea entidad nueva.
-- =============================================================================

ALTER TABLE staff
    ADD COLUMN dni           VARCHAR(20),
    -- Texto libre a propósito: Nico quiere "saber qué materias dan" para poder
    -- contactarlas, no un modelo de plan de estudios. Si algún día hace falta
    -- cruzarlo con las clases, sale de `hour_logs`, no de acá.
    ADD COLUMN subject       VARCHAR(200),
    -- RESIDENCIAS | FORMACION_SUPERIOR | AMBAS. NULL = sin especificar (filas viejas).
    ADD COLUMN segment       VARCHAR(30),
    -- false = cobra sueldo fijo y NO entra en la liquidación por horas. Sale de la
    -- llamada (13:22): de las tres, una ya cobra sueldo como preceptora y sólo dos
    -- (Juana y Tere) se liquidan por horas.
    ADD COLUMN paid_by_hours BOOLEAN NOT NULL DEFAULT true,
    -- Override individual del valor hora. NULL = usar el del tipo de actividad.
    -- Cubre las dos respuestas posibles a la pregunta abierta sobre si el valor
    -- hora es único por rol o propio de cada persona (doc 17 §7.2).
    ADD COLUMN hourly_rate   NUMERIC(12,2);

-- DIRECTORA es el rótulo nuevo: las directoras de PREMA se cargan como personal
-- académico y la liquidación de la diplomatura las referencia desde acá.
ALTER TABLE staff DROP CONSTRAINT ck_staff_type;
ALTER TABLE staff ADD CONSTRAINT ck_staff_type CHECK (
    staff_type IN ('DOCENTE', 'TUTORA', 'PRECEPTORA', 'DIRECTORA'));

ALTER TABLE staff ADD CONSTRAINT ck_staff_segment CHECK (
    segment IS NULL OR segment IN ('RESIDENCIAS', 'FORMACION_SUPERIOR', 'AMBAS'));

ALTER TABLE staff ADD CONSTRAINT ck_staff_hourly_rate CHECK (
    hourly_rate IS NULL OR hourly_rate >= 0);

-- Evita cargar dos veces a la misma persona. Parcial por el soft delete: una fila
-- borrada no debe bloquear volver a darla de alta.
CREATE UNIQUE INDEX uk_staff_dni_active
    ON staff (dni)
    WHERE dni IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_staff_segment ON staff (segment) WHERE deleted_at IS NULL;

-- `activity_types.applies_to` sólo admitía DOCENTE/TUTORA/ALL. Las preceptoras
-- tienen su propio valor hora (la planilla de Nico tiene "valor hora" y "valor
-- preceptora" separados), así que necesitan su propia tarifa.
ALTER TABLE activity_types DROP CONSTRAINT ck_activity_applies_to;
ALTER TABLE activity_types ADD CONSTRAINT ck_activity_applies_to CHECK (
    applies_to IN ('DOCENTE', 'TUTORA', 'PRECEPTORA', 'DIRECTORA', 'ALL'));

COMMENT ON COLUMN staff.segment IS
    'Unidad de negocio en la que trabaja: RESIDENCIAS, FORMACION_SUPERIOR o AMBAS. Filtrar por una unidad debe incluir AMBAS.';
COMMENT ON COLUMN staff.paid_by_hours IS
    'false = sueldo fijo, queda fuera de la liquidación por horas (reunión 24-jul 13:22).';
COMMENT ON COLUMN staff.hourly_rate IS
    'Override individual del valor hora. NULL = usar el rate del activity_type correspondiente.';
