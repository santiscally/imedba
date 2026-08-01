-- =============================================================================
-- V039 — Tipo de notificación para el pedido de factura por horas docentes.
--
-- Nico mandó las dos plantillas el 2026-07-31:
--   1) «Imedba - Honorarios docentes»            → a docentes y preceptoras, con el
--      detalle de clases del mes y los datos de facturación.
--   2) «Imedba - Formación Superior Honorarios»  → a las directoras de PREMA.
--
-- La segunda reusa el tipo `SETTLEMENT_APPROVED` que ya existía (V019); sólo
-- cambió el texto. La primera necesita tipo propio y su propia entidad
-- relacionada, para que la dedup de NotificationService no la confunda con otra.
-- =============================================================================

ALTER TABLE notifications DROP CONSTRAINT ck_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT ck_notifications_type CHECK (type IN (
    'CONTRACT', 'WELCOME', 'PAYMENT_RECEIPT',
    'INSTALLMENT_DUE_SOON', 'INSTALLMENT_OVERDUE',
    'PRE_SUSPENSION', 'SUSPENDED',
    'SETTLEMENT_APPROVED',
    'TEACHING_INVOICE_REQUEST'
));

ALTER TABLE notifications DROP CONSTRAINT ck_notifications_related_entity;
ALTER TABLE notifications ADD CONSTRAINT ck_notifications_related_entity CHECK (
    related_entity_type IS NULL OR related_entity_type IN (
        'ENROLLMENT', 'INSTALLMENT', 'PAYMENT',
        'DIPLOMA_SETTLEMENT',
        'TEACHING_SETTLEMENT'
    )
);

COMMENT ON COLUMN notifications.type IS
    'Tipo funcional. TEACHING_INVOICE_REQUEST (V039) = pedido de factura por horas docentes o de preceptoría.';
