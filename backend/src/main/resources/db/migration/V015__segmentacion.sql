-- =============================================================================
-- V015 — Fase 9.a: Segmentación Residencias ↔ Formación Superior
-- =============================================================================
-- Cambios:
--   1) Habilitar extension `unaccent` para búsquedas insensibles a tildes.
--   2) Unificar enum BusinessUnit a {RESIDENCIAS, EDITORIAL, FORMACION_SUPERIOR, GENERAL}:
--      - courses.business_unit: 'PREMATUROS' -> 'FORMACION_SUPERIOR'
--      - courses.business_unit: 'OTROS'      -> 'GENERAL'
--      - budget_entries.business_unit: drop 'PREMATUROS' del CHECK.
--   3) Agregar columna `country VARCHAR(2)` a `courses` (default 'AR').
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1) Migración de datos en courses ─────────────────────────────────────────────
UPDATE courses SET business_unit = 'FORMACION_SUPERIOR' WHERE business_unit = 'PREMATUROS';
UPDATE courses SET business_unit = 'GENERAL'            WHERE business_unit = 'OTROS';

-- 2) Recreación del CHECK en budget_entries (sin 'PREMATUROS') ─────────────────
ALTER TABLE budget_entries DROP CONSTRAINT IF EXISTS ck_budget_business_unit;
UPDATE budget_entries SET business_unit = 'FORMACION_SUPERIOR' WHERE business_unit = 'PREMATUROS';
ALTER TABLE budget_entries ADD CONSTRAINT ck_budget_business_unit CHECK (
    business_unit IS NULL OR business_unit IN (
        'RESIDENCIAS', 'EDITORIAL', 'FORMACION_SUPERIOR', 'GENERAL'
    )
);

-- 3) Nueva columna `country` en courses ────────────────────────────────────────
ALTER TABLE courses ADD COLUMN country VARCHAR(2) NOT NULL DEFAULT 'AR';
CREATE INDEX idx_courses_country ON courses (country) WHERE deleted_at IS NULL;
