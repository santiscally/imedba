package com.imedba.modules.enrollment.repository;

import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.enrollment.entity.EnrollmentStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EnrollmentRepository
        extends JpaRepository<Enrollment, UUID>, JpaSpecificationExecutor<Enrollment> {

    boolean existsByStudentIdAndCourseIdAndStatusIn(
            UUID studentId, UUID courseId, java.util.Collection<EnrollmentStatus> statuses);

    boolean existsByStudentIdAndStatusIn(
            UUID studentId, java.util.Collection<EnrollmentStatus> statuses);

    boolean existsByStudentId(UUID studentId);

    boolean existsByCourseId(UUID courseId);

    /** Inscripciones del alumno con el curso ya cargado (JOIN FETCH evita el N+1 al exportar). */
    @Query("select e from Enrollment e join fetch e.course where e.student.id = :studentId")
    List<Enrollment> findByStudentIdFetchCourse(@Param("studentId") UUID studentId);
}
