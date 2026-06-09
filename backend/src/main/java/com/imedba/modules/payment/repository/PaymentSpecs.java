package com.imedba.modules.payment.repository;

import com.imedba.common.enums.PaymentMethod;
import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.payment.entity.Payment;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public final class PaymentSpecs {

    private PaymentSpecs() {}

    public static Specification<Payment> byEnrollment(UUID enrollmentId) {
        return (root, q, cb) -> enrollmentId == null
                ? null : cb.equal(root.get("enrollment").get("id"), enrollmentId);
    }

    /**
     * Búsqueda libre por alumno (nombre + apellido), curso (nombre + código) o
     * número de recibo. Case-insensitive. Reunión 2026-06-05: el SPA ya mandaba
     * {@code q} pero el backend lo ignoraba.
     */
    public static Specification<Payment> matchesText(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        final String needle = "%" + text.trim().toLowerCase() + "%";
        return (root, q, cb) -> {
            var student = root.get("enrollment").get("student");
            var course = root.get("enrollment").get("course");
            var fullName = cb.lower(cb.concat(cb.concat(
                    student.<String>get("firstName"), " "), student.<String>get("lastName")));
            var courseName = cb.lower(course.<String>get("name"));
            var courseCode = cb.lower(cb.coalesce(course.<String>get("code"), ""));
            var receipt = cb.lower(cb.coalesce(root.<String>get("receiptNumber"), ""));
            return cb.or(
                    cb.like(fullName, needle),
                    cb.like(courseName, needle),
                    cb.like(courseCode, needle),
                    cb.like(receipt, needle));
        };
    }

    /** Filtra pagos por curso resolviendo vía enrollment.course.id (reunión 2026-05-22 §2.4). */
    public static Specification<Payment> byCourse(UUID courseId) {
        return (root, q, cb) -> courseId == null
                ? null : cb.equal(root.get("enrollment").get("course").get("id"), courseId);
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

    /** Segmentación Residencias↔FS: filtra pagos cuyo curso (vía enrollment) esté en {@code allowed}. */
    public static Specification<Payment> byBusinessUnits(Set<BusinessUnit> allowed) {
        if (allowed == null || allowed.size() >= BusinessUnit.values().length) {
            return null;
        }
        return (root, q, cb) -> root.get("enrollment").get("course").get("businessUnit").in(allowed);
    }
}
