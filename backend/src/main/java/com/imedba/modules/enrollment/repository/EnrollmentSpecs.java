package com.imedba.modules.enrollment.repository;

import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.enrollment.entity.EnrollmentStatus;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

/**
 * Criterios reutilizables para listar inscripciones.
 * La restricción de soft delete la aplica {@code @SQLRestriction} de la entidad.
 */
public final class EnrollmentSpecs {

    private EnrollmentSpecs() {}

    public static Specification<Enrollment> byStudent(UUID studentId) {
        return (root, q, cb) -> studentId == null ? null : cb.equal(root.get("student").get("id"), studentId);
    }

    public static Specification<Enrollment> byCourse(UUID courseId) {
        return (root, q, cb) -> courseId == null ? null : cb.equal(root.get("course").get("id"), courseId);
    }

    public static Specification<Enrollment> byStatus(EnrollmentStatus status) {
        return (root, q, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    /** Para la restricción de vendedora: sólo ve lo que ella cargó. */
    public static Specification<Enrollment> byEnrolledBy(UUID enrolledBy) {
        return (root, q, cb) -> enrolledBy == null ? null : cb.equal(root.get("enrolledBy"), enrolledBy);
    }
}
