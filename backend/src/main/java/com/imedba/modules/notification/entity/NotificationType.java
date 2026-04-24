package com.imedba.modules.notification.entity;

/**
 * Tipos funcionales de notificación. El mapeo a CHECK constraint vive en V008.
 */
public enum NotificationType {
    CONTRACT,
    WELCOME,
    PAYMENT_RECEIPT,
    INSTALLMENT_DUE_SOON,
    PRE_SUSPENSION,
    SUSPENDED
}
