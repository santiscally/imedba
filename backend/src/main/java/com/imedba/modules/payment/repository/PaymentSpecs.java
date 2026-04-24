package com.imedba.modules.payment.repository;

import com.imedba.common.enums.PaymentMethod;
import com.imedba.modules.payment.entity.Payment;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public final class PaymentSpecs {

    private PaymentSpecs() {}

    public static Specification<Payment> byEnrollment(UUID enrollmentId) {
        return (root, q, cb) -> enrollmentId == null
                ? null : cb.equal(root.get("enrollment").get("id"), enrollmentId);
    }

    public static Specification<Payment> byInstallment(UUID installmentId) {
        return (root, q, cb) -> installmentId == null
                ? null : cb.equal(root.get("installment").get("id"), installmentId);
    }

    public static Specification<Payment> byMethod(PaymentMethod method) {
        return (root, q, cb) -> method == null ? null : cb.equal(root.get("paymentMethod"), method);
    }

    public static Specification<Payment> dateFrom(Instant from) {
        return (root, q, cb) -> from == null ? null : cb.greaterThanOrEqualTo(root.get("paymentDate"), from);
    }

    public static Specification<Payment> dateTo(Instant to) {
        return (root, q, cb) -> to == null ? null : cb.lessThanOrEqualTo(root.get("paymentDate"), to);
    }

    public static Specification<Payment> byEnrolledBy(UUID userId) {
        return (root, q, cb) -> userId == null ? null
                : cb.equal(root.get("enrollment").get("enrolledBy"), userId);
    }
}
