-- =============================================================================
-- V019 — Notificación SETTLEMENT_APPROVED a directoras.
-- Pedido en reunión 2026-05-22 §2.6 (Nico 46:56):
--   "el mail que les tiene que llegar de cuánto van a facturar para que
--   nosotros le paguemos".
-- =============================================================================

-- Drop & recreate de los CHECK constraints para agregar los valores nuevos.
ALTER TABLE notifications DROP CONSTRAINT ck_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT ck_notifications_type CHECK (type IN (
    'CONTRACT', 'WELCOME', 'PAYMENT_RECEIPT',
    'INSTALLMENT_DUE_SOON', 'PRE_SUSPENSION', 'SUSPENDED',
    'SETTLEMENT_APPROVED'
));

ALTER TABLE notifications DROP CONSTRAINT ck_notifications_related_entity;
ALTER TABLE notifications ADD CONSTRAINT ck_notifications_related_entity CHECK (
    related_entity_type IS NULL OR related_entity_type IN (
        'ENROLLMENT', 'INSTALLMENT', 'PAYMENT', 'DIPLOMA_SETTLEMENT'
    )
);
