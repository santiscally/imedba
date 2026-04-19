-- =============================================================================
-- IMEDBA — Migración baseline. Infraestructura común a todas las tablas.
--
-- Esta migración NO crea tablas de negocio. Esas entran en Fase 1+:
--   V002__students.sql, V003__courses.sql, V004__enrollments.sql, ...
-- =============================================================================

-- UUIDs y crypto (gen_random_uuid()).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Búsqueda case-insensitive (trigram) — útil para buscar alumnos por nombre/email.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Normalización sin acentos — útil para búsquedas "Martínez" ↔ "martinez".
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Setear zona horaria de la DB a Argentina (el backend también fuerza TZ en JPA).
SET TIME ZONE 'America/Argentina/Buenos_Aires';

-- -----------------------------------------------------------------------------
-- Trigger genérico para mantener `updated_at` fresco en todas las tablas que lo
-- tengan. A partir de V002 se asocia en cada tabla:
--
--   CREATE TRIGGER set_updated_at BEFORE UPDATE ON <tabla>
--     FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trg_set_updated_at()
    IS 'Trigger BEFORE UPDATE que pisa updated_at con NOW(). Usar en todas las tablas con auditoría.';

-- -----------------------------------------------------------------------------
-- Tabla de metadatos propia del proyecto (no confundir con flyway_schema_history).
-- Sirve para dejar banderas de ambiente y versión de negocio consultables en runtime.
-- -----------------------------------------------------------------------------
CREATE TABLE app_metadata (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_metadata (key, value, description) VALUES
    ('schema.baseline.version', '1', 'Versión del baseline inicial'),
    ('app.timezone', 'America/Argentina/Buenos_Aires', 'Zona horaria canónica de la aplicación');
