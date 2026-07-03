-- =============================================================================
-- V032 — Nuevo tipo de notificación INSTALLMENT_OVERDUE (Recordatorio de pago 2).
-- Se dispara al aplicar el 5% de recargo (día siguiente al vencimiento, la cuota
-- pasa a OVERDUE). Textos de Nico; ver NotificationTemplates.installmentOverdue.
-- =============================================================================

ALTER TABLE notifications DROP CONSTRAINT ck_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT ck_notifications_type CHECK (type IN (
    'CONTRACT', 'WELCOME', 'PAYMENT_RECEIPT',
    'INSTALLMENT_DUE_SOON', 'INSTALLMENT_OVERDUE',
    'PRE_SUSPENSION', 'SUSPENDED',
    'SETTLEMENT_APPROVED'
));
