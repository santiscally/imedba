package com.imedba.modules.diplomaenrollment.dto;

import com.imedba.common.enums.PaymentMethod;
import com.imedba.modules.diplomaenrollment.entity.DiplomaEnrollmentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record DiplomaEnrollmentResponse(
        UUID id,
        UUID diplomaId,
        String diplomaName,
        UUID studentId,
        String studentName,
        LocalDate enrollmentDate,
        Integer numInstallments,
        PaymentMethod paymentMethod,
        DiplomaEnrollmentStatus status,
        BigDecimal pendingAmount,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {}
