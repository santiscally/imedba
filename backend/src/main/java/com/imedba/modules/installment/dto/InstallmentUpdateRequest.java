package com.imedba.modules.installment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Permite editar monto, vencimiento y una nota/aclaración (admin override). El status lo
 * manejan los endpoints de acción (markPaid) o el scheduler. No se actualiza surcharge
 * manualmente: si el admin quiere condonarlo, hay endpoint dedicado.
 *
 * <p>{@code notes}: aclaración del ajuste manual del monto (reunión 2026-06-05, Nico) —
 * ej. "acordado: paga la mitad ahora y el resto en dos cuotas".</p>
 */
public record InstallmentUpdateRequest(
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal amount,
        LocalDate dueDate,
        String notes
) {}
