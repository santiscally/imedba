-- =============================================================================
-- V008 — Notificaciones (notifications).
--
-- Unifica templates, emails y alertas. Cada row es una notificación que vive
-- en una máquina de estados: QUEUED → SENT / FAILED / CANCELLED.
--
-- Tipos funcionales:
--   CONTRACT               contrato generado al inscribir
--   WELCOME                bienvenida post-inscripción
--   PAYMENT_RECEIPT        recibo por pago confirmado
--   INSTALLMENT_DUE_SOON   recordatorio a 3 días del vencimiento (futuro)
--   PRE_SUSPENSION         aviso día 20 "se suspende Moodle en 2 días"
--   SUSPENDED              aviso post-suspensión (día 22)
--
-- related_entity_type + related_entity_id apuntan al dominio del disparo
-- (ENROLLMENT, INSTALLMENT, PAYMENT) sin FK dura — las notificaciones sobreviven
-- al soft-delete de su entidad origen para auditoría.
-- =============================================================================

CREATE TABLE notifications (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type                 VARCHAR(40) NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    recipient_email      VARCHAR(255) NOT NULL,
    subject              VARCHAR(500) NOT NULL,
    body                 TEXT NOT NULL,
    template_key         VARCHAR(100),
    related_entity_type  VARCHAR(40),
    related_entity_id    UUID,
    scheduled_for        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at              TIMESTAMPTZ,
    error_message        TEXT,
    attempts             INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_notifications_type CHECK (type IN (
        'CONTRACT', 'WELCOME', 'PAYMENT_RECEIPT',
        'INSTALLMENT_DUE_SOON', 'PRE_SUSPENSION', 'SUSPENDED'
    )),
    CONSTRAINT ck_notifications_status CHECK (status IN (
        'QUEUED', 'SENT', 'FAILED', 'CANCELLED'
    )),
    CONSTRAINT ck_notifications_related_entity CHECK (related_entity_type IS NULL OR related_entity_type IN (
        'ENROLLMENT', 'INSTALLMENT', 'PAYMENT'
    )),
    CONSTRAINT ck_notifications_attempts CHECK (attempts >= 0)
);

-- Índice principal del dispatcher: buscar QUEUED con scheduled_for <= NOW().
CREATE INDEX idx_notifications_dispatch ON notifications (scheduled_for)
    WHERE status = 'QUEUED';

CREATE INDEX idx_notifications_status_type ON notifications (status, type);
CREATE INDEX idx_notifications_related
    ON notifications (related_entity_type, related_entity_id)
    WHERE related_entity_id IS NOT NULL;
CREATE INDEX idx_notifications_recipient ON notifications (recipient_email);
CREATE INDEX idx_notifications_sent_at ON notifications (sent_at DESC)
    WHERE sent_at IS NOT NULL;

CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
