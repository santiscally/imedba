package com.imedba.modules.payment.dto;

import com.imedba.common.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Payload para registrar un pago.
 *   - installmentId: obligatorio para pagos imputados a una cuota (flujo normal).
 *   - enrollmentId es inferido desde la cuota si no se manda.
 *   - Si no hay installmentId, enrollmentId es obligatorio (pago manual / ajuste).
 *   - receiptNumber lo genera el servidor (no se acepta desde el cliente).
 */
public record PaymentCreateRequest(
        UUID installmentId,
        UUID enrollmentId,
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @NotNull PaymentMethod paymentMethod,
        Instant paymentDate,
        @Size(max = 200) String referenceNumber,
        @Size(max = 500) String receiptFilePath,
        String notes
) {}
