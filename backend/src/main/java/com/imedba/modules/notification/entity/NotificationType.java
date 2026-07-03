package com.imedba.modules.notification.entity;

/**
 * Tipos funcionales de notificación. El mapeo a CHECK constraint vive en V008.
 */
public enum NotificationType {
    CONTRACT,
    WELCOME,
    PAYMENT_RECEIPT,
    INSTALLMENT_DUE_SOON,
    /** Recordatorio 2 (Nico): cuota vencida con recargo aplicado (día siguiente al vencimiento). */
    INSTALLMENT_OVERDUE,
    PRE_SUSPENSION,
    SUSPENDED,
    /** Email a directoras al aprobar una liquidación (reunión 2026-05-22 §2.6). */
    SETTLEMENT_APPROVED
}
