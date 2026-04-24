package com.imedba.modules.diplomaenrollment.dto;

import com.imedba.common.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record DiplomaEnrollmentCreateRequest(
        @NotNull UUID diplomaId,
        @NotNull UUID studentId,
        LocalDate enrollmentDate,
        @Min(1) @Max(60) Integer numInstallments,
        PaymentMethod paymentMethod,
        @DecimalMin(value = "0.00") BigDecimal pendingAmount,
        String notes
) {}
