package com.imedba.modules.enrollment.entity;

/**
 * Grupo de pago de una inscripción (reunión IMEDBA 2026-06-05, Nico 11:17-13:35).
 * Define el día de vencimiento de las cuotas y, en consecuencia, cuándo arranca el recargo.
 *
 * <ul>
 *   <li>{@link #GROUP_1}: cuota vence el día 10 (ventana de pago 1–10), recargo desde el día 11.</li>
 *   <li>{@link #GROUP_2}: cuota vence el día 20 (ventana de pago 10–20), recargo desde el día 21.</li>
 * </ul>
 *
 * El recargo lo aplica {@code InstallmentScheduler} el día siguiente al vencimiento (grace 1),
 * por lo que el umbral se deriva solo del {@link #dueDay()}.
 */
public enum PaymentGroup {
    GROUP_1(10),
    GROUP_2(20);

    private final int dueDay;

    PaymentGroup(int dueDay) {
        this.dueDay = dueDay;
    }

    /** Día del mes en que vence cada cuota de este grupo (último día sin recargo). */
    public int dueDay() {
        return dueDay;
    }
}
