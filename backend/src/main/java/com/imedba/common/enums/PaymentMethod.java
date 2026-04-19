package com.imedba.common.enums;

/**
 * Medios de pago. Persistidos como VARCHAR(30). Compartido por {@code enrollments},
 * {@code payments} (Fase 2), {@code diploma_enrollments} y {@code budget_entries}.
 */
public enum PaymentMethod {
    TRANSFERENCIA,
    EFECTIVO,
    TARJETA_CREDITO,
    TARJETA_DEBITO,
    MERCADO_PAGO,
    DEBITO_AUTOMATICO,
    OTRO
}
