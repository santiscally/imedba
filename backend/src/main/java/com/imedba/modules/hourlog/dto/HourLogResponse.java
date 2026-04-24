package com.imedba.modules.hourlog.dto;

import com.imedba.modules.hourlog.entity.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record HourLogResponse(
        UUID id,
        UUID staffId,
        String staffName,
        String activityType,
        Integer periodMonth,
        Integer periodYear,
        BigDecimal hours,
        BigDecimal ratePerHour,
        BigDecimal totalAmount,
        Instant invoiceEmailSentAt,
        Boolean invoiceReceived,
        String invoiceFilePath,
        PaymentStatus paymentStatus,
        Instant paidAt,
        String notes,
        Instant createdAt
) {}
