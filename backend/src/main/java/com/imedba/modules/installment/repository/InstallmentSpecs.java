package com.imedba.modules.installment.repository;

import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public final class InstallmentSpecs {

    private InstallmentSpecs() {}

    public static Specification<Installment> byEnrollment(UUID enrollmentId) {
        return (root, q, cb) -> enrollmentId == null
                ? null : cb.equal(root.get("enrollment").get("id"), enrollmentId);
    }

    public static Specification<Installment> byStatus(InstallmentStatus status) {
        return (root, q, cb) -> status == null ? null : cb.equal(root.get("status"), status);
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
}
