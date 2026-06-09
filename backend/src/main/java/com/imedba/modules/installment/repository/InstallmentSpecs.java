package com.imedba.modules.installment.repository;

import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.enrollment.entity.PaymentGroup;
import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public final class InstallmentSpecs {

    private InstallmentSpecs() {}

    public static Specification<Installment> byEnrollment(UUID enrollmentId) {
        return (root, q, cb) -> enrollmentId == null
                ? null : cb.equal(root.get("enrollment").get("id"), enrollmentId);
    }

    /**
     * Búsqueda libre por alumno (nombre + apellido) o curso (nombre + código), vía
     * enrollment. Case-insensitive. Reunión 2026-06-05: el SPA ya mandaba {@code q}
     * pero el backend lo ignoraba — buscar por alumno en Cuotas no filtraba.
     */
    public static Specification<Installment> matchesText(String text) {
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
            return cb.or(
                    cb.like(fullName, needle),
                    cb.like(courseName, needle),
                    cb.like(courseCode, needle));
        };
    }

    /** Filtra cuotas por curso vía enrollment.course.id (reunión 2026-05-22 §2.4). */
    public static Specification<Installment> byCourse(UUID courseId) {
        return (root, q, cb) -> courseId == null
                ? null : cb.equal(root.get("enrollment").get("course").get("id"), courseId);
    }

    public static Specification<Installment> byStatus(InstallmentStatus status) {
        return (root, q, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    /** Cuotas impagas (PENDING u OVERDUE). Usada por la vista de deudores. */
    public static Specification<Installment> notPaid() {
        return (root, q, cb) -> cb.notEqual(root.get("status"), InstallmentStatus.PAID);
    }

    /** Filtra por grupo de pago de la inscripción (GROUP_1 vence 10, GROUP_2 vence 20). */
    public static Specification<Installment> byPaymentGroup(PaymentGroup group) {
        return (root, q, cb) -> group == null
                ? null : cb.equal(root.get("enrollment").get("paymentGroup"), group);
    }

    public static Specification<Installment> dueFrom(LocalDate from) {
        return (root, q, cb) -> from == null ? null : cb.greaterThanOrEqualTo(root.get("dueDate"), from);
    }

    public static Specification<Installment> dueTo(LocalDate to) {
        return (root, q, cb) -> to == null ? null : cb.lessThanOrEqualTo(root.get("dueDate"), to);
    }

    /** Vendedora: sólo ve cuotas de inscripciones que ella cargó. */
    public static Specification<Installment> byEnrolledBy(UUID userId) {
        return (root, q, cb) -> userId == null ? null
                : cb.equal(root.get("enrollment").get("enrolledBy"), userId);
    }

    /** Segmentación Residencias↔FS: filtra cuotas cuyo curso (vía enrollment) esté en {@code allowed}. */
    public static Specification<Installment> byBusinessUnits(Set<BusinessUnit> allowed) {
        if (allowed == null || allowed.size() >= BusinessUnit.values().length) {
            return null;
        }
        return (root, q, cb) -> root.get("enrollment").get("course").get("businessUnit").in(allowed);
    }
}
