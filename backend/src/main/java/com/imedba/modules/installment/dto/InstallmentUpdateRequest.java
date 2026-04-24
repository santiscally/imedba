package com.imedba.modules.installment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Solo permite editar monto y vencimiento (admin override). El status lo manejan
 * los endpoints de acción (markPaid) o el scheduler. No se actualiza surcharge
 * manualmente: si el admin quiere condonarlo, hay endpoint dedicado.
 */
public record InstallmentUpdateRequest(
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal amount,
        LocalDate dueDate
) {}
