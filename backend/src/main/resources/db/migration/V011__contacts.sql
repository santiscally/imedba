-- =============================================================================
-- V011 — Contacts unificados (empleados + proveedores).
--
-- Un único catálogo para empleados y proveedores. El tipo se define en
-- contact_type. Para proveedores: company_name + role_description ("Imprenta").
-- Para empleados: first_name + last_name + keycloak_user_id opcional si tienen
-- acceso al sistema.
--
-- Soft delete vía deleted_at (nunca DELETE físico).
-- =============================================================================

CREATE TABLE contacts (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_type       VARCHAR(20) NOT NULL,
    first_name         VARCHAR(100),
    last_name          VARCHAR(100),
    company_name       VARCHAR(200),
    email              VARCHAR(255),
    phone              VARCHAR(50),
    role_description   VARCHAR(200),
    keycloak_user_id   UUID,
    is_active          BOOLEAN NOT NULL DEFAULT true,
    notes              TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by         UUID,
    deleted_at         TIMESTAMPTZ,

    CONSTRAINT ck_contacts_type CHECK (contact_type IN ('EMPLEADO', 'PROVEEDOR')),
    CONSTRAINT ck_contacts_name CHECK (
        (contact_type = 'EMPLEADO' AND first_name IS NOT NULL AND last_name IS NOT NULL)
        OR (contact_type = 'PROVEEDOR' AND company_name IS NOT NULL)
    )
);

CREATE INDEX idx_contacts_type      ON contacts (contact_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_active    ON contacts (is_active)    WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_email     ON contacts (lower(email)) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_contacts_keycloak  ON contacts (keycloak_user_id) WHERE keycloak_user_id IS NOT NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
