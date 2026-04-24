package com.imedba.modules.diplomaenrollment.dto;

import com.imedba.common.enums.PaymentMethod;
import com.imedba.modules.diplomaenrollment.entity.DiplomaEnrollmentStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import java.time.LocalDate;

public record DiplomaEnrollmentUpdateRequest(
        LocalDate enrollmentDate,
        @Min(1) @Max(60) Integer numInstallments,
        PaymentMethod paymentMethod,
        DiplomaEnrollmentStatus status,
        @DecimalMin(value = "0.00") BigDecimal pendingAmount,
        String notes
) {}
