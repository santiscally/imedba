package com.imedba.modules.enrollment.dto;

import com.imedba.common.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Update parcial. student/course son inmutables una vez creada la inscripción:
 * si hay que cambiar alumno o curso, se crea una inscripción nueva.
 */
public record EnrollmentUpdateRequest(
        UUID discountCampaignId,

        @Digits(integer = 10, fraction = 2) BigDecimal listPrice,
        @DecimalMin("0.00") @DecimalMax("100.00") @Digits(integer = 3, fraction = 2) BigDecimal discountPercentage,
        @Digits(integer = 10, fraction = 2) BigDecimal bookPrice,

        @Digits(integer = 10, fraction = 2) BigDecimal enrollmentFee,
        @Min(1) Integer numInstallments,
        PaymentMethod paymentMethod,

        @Size(max = 500) String contractFilePath,
        Instant contractSentAt,
        Instant contractSignedAt,

        String notes
) {}
