package com.imedba.modules.payment.dto;

import com.imedba.common.enums.PaymentMethod;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentResponse(
        UUID id,
        UUID installmentId,
        UUID enrollmentId,
        BigDecimal amount,
        PaymentMethod paymentMethod,
        Instant paymentDate,
        String referenceNumber,
        String receiptNumber,
        String receiptFilePath,
        Instant receiptSentAt,
        String notes,
        UUID registeredBy,
        Instant createdAt
) {}
