package com.imedba.modules.enrollment.dto;

import com.imedba.modules.enrollment.entity.InstallmentDistribution;
import com.imedba.modules.enrollment.entity.PaymentGroup;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Payload para crear una inscripción.
 * Si {@code listPrice} viene null se toma del curso (enrollmentPrice + coursePrice según política).
 * {@code finalPrice} y {@code totalPrice} los calcula el servicio.
 *
 * <p>{@code distributionMode} (reunión 2026-06-12, 3 opciones de Nico):
 *   - {@code SEPARATE} (default): cuota 0 con la matrícula + N cuotas por el curso; libros aparte.
 *   - {@code TOTAL}: suma curso + matrícula + libros en N cuotas iguales.
 *   - {@code COURSE_AND_FEE}: suma curso + matrícula en N cuotas iguales; libros aparte.
 */
public record EnrollmentCreateRequest(
        @NotNull UUID studentId,
        @NotNull UUID courseId,
        UUID discountCampaignId,
        Instant enrollmentDate,

        @Digits(integer = 10, fraction = 2) BigDecimal listPrice,
        @DecimalMin("0.00") @DecimalMax("100.00") @Digits(integer = 3, fraction = 2) BigDecimal discountPercentage,
        @Digits(integer = 10, fraction = 2) BigDecimal bookPrice,

        @Digits(integer = 10, fraction = 2) BigDecimal enrollmentFee,
        @Min(1) Integer numInstallments,
        InstallmentDistribution distributionMode,
        PaymentGroup paymentGroup,

        @Size(max = 500) String contractFilePath,
        String notes
) {}
