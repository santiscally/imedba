package com.imedba.modules.diplomaenrollment.mapper;

import com.imedba.modules.diplomaenrollment.dto.DiplomaEnrollmentResponse;
import com.imedba.modules.diplomaenrollment.entity.DiplomaEnrollment;
import com.imedba.modules.student.entity.Student;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DiplomaEnrollmentMapper {

    default DiplomaEnrollmentResponse toResponse(DiplomaEnrollment e) {
        if (e == null) return null;
        Student s = e.getStudent();
        String studentName = s == null ? null
                : ((s.getFirstName() == null ? "" : s.getFirstName()) + " "
                        + (s.getLastName() == null ? "" : s.getLastName())).trim();
        return new DiplomaEnrollmentResponse(
                e.getId(),
                e.getDiploma() == null ? null : e.getDiploma().getId(),
                e.getDiploma() == null ? null : e.getDiploma().getName(),
                s == null ? null : s.getId(),
                studentName,
                e.getEnrollmentDate(),
                e.getNumInstallments(),
                e.getPaymentMethod(),
                e.getStatus(),
                e.getPendingAmount(),
                e.getNotes(),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }
}
