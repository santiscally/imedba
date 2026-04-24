package com.imedba.modules.installment.entity;

/**
 * Estado de una cuota. Persistido como VARCHAR(20).
 *   PENDING — no vencida o vencida sin recargo aplicado aún.
 *   PAID    — pagada totalmente.
 *   OVERDUE — vencida con recargo aplicado y aún no pagada.
 */
public enum InstallmentStatus {
    PENDING,
    PAID,
    OVERDUE
}
