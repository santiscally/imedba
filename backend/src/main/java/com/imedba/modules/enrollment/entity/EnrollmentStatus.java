package com.imedba.modules.enrollment.entity;

/**
 * Estado de una inscripción. Persistido como VARCHAR(30).
 * Transiciones típicas:
 *   ACTIVE -> SUSPENDED (pago atrasado / pedido de la institución)
 *   SUSPENDED -> ACTIVE (regularización)
 *   ACTIVE -> COMPLETED (finalización del curso)
 *   ACTIVE -> CANCELLED (baja del alumno)
 */
public enum EnrollmentStatus {
    ACTIVE,
    SUSPENDED,
    COMPLETED,
    CANCELLED
}
