package com.imedba.modules.diplomaenrollment.repository;

import com.imedba.modules.diplomaenrollment.entity.DiplomaEnrollment;
import com.imedba.modules.diplomaenrollment.entity.DiplomaEnrollmentStatus;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public final class DiplomaEnrollmentSpecs {

    private DiplomaEnrollmentSpecs() {}

    public static Specification<DiplomaEnrollment> byDiploma(UUID diplomaId) {
        if (diplomaId == null) return null;
        return (root, q, cb) -> cb.equal(root.get("diploma").get("id"), diplomaId);
    }

    public static Specification<DiplomaEnrollment> byStudent(UUID studentId) {
        if (studentId == null) return null;
        return (root, q, cb) -> cb.equal(root.get("student").get("id"), studentId);
    }

    public static Specification<DiplomaEnrollment> byStatus(DiplomaEnrollmentStatus status) {
        if (status == null) return null;
        return (root, q, cb) -> cb.equal(root.get("status"), status);
    }
}
