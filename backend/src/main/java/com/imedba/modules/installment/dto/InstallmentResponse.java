package com.imedba.modules.installment.dto;

import com.imedba.modules.installment.entity.InstallmentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record InstallmentResponse(
        UUID id,
        UUID enrollmentId,
        Integer number,
        BigDecimal amount,
        BigDecimal surchargeAmount,
        BigDecimal totalDue,
        LocalDate dueDate,
        InstallmentStatus status,
        Instant paidAt,
        Instant lastAlertSentAt,
        Instant createdAt,
        Instant updatedAt
) {}
