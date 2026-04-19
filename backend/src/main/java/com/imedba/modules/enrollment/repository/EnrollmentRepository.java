package com.imedba.modules.enrollment.repository;

import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.enrollment.entity.EnrollmentStatus;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface EnrollmentRepository
        extends JpaRepository<Enrollment, UUID>, JpaSpecificationExecutor<Enrollment> {

    boolean existsByStudentIdAndCourseIdAndStatusIn(
            UUID studentId, UUID courseId, java.util.Collection<EnrollmentStatus> statuses);
}
