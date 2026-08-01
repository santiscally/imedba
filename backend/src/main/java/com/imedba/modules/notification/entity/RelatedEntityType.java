package com.imedba.modules.notification.entity;

public enum RelatedEntityType {
    ENROLLMENT,
    INSTALLMENT,
    PAYMENT,
    /** Para emails de liquidación de diplomatura aprobada. */
    DIPLOMA_SETTLEMENT,
    /** Para el pedido de factura por horas docentes o de preceptoría (V039). */
    TEACHING_SETTLEMENT
}
