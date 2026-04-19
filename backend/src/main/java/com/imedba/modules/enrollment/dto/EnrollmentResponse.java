package com.imedba.modules.enrollment.dto;

import com.imedba.common.enums.PaymentMethod;
import com.imedba.modules.enrollment.entity.EnrollmentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record EnrollmentResponse(
        UUID id,
        StudentSummary student,
        CourseSummary course,
        UUID discountCampaignId,
        UUID enrolledBy,
        Instant enrollmentDate,

        BigDecimal listPrice,
        BigDecimal discountPercentage,
        BigDecimal finalPrice,
        BigDecimal bookPrice,
        BigDecimal totalPrice,

        BigDecimal enrollmentFee,
        Integer numInstallments,
        PaymentMethod paymentMethod,

        String contractFilePath,
        Instant contractSentAt,
        Instant contractSignedAt,

        EnrollmentStatus status,
        String moodleStatus,
        String notes,

        Instant createdAt,
        Instant updatedAt
) {
    public record StudentSummary(UUID id, String firstName, String lastName, String email) {}
    public record CourseSummary(UUID id, String name, String code) {}
}
