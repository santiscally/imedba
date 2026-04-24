package com.imedba.modules.diplomaenrollment.repository;

import com.imedba.modules.diplomaenrollment.entity.DiplomaEnrollment;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DiplomaEnrollmentRepository extends JpaRepository<DiplomaEnrollment, UUID>,
        JpaSpecificationExecutor<DiplomaEnrollment> {
}
