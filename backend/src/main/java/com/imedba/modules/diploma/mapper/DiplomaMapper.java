package com.imedba.modules.diploma.mapper;

import com.imedba.modules.course.entity.Course;
import com.imedba.modules.diploma.dto.CommissionResponse;
import com.imedba.modules.diploma.dto.DiplomaResponse;
import com.imedba.modules.diploma.dto.DiplomaResponse.DirectorRefDto;
import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.staff.entity.Staff;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DiplomaMapper {

    default DiplomaResponse toResponse(Diploma d) {
        if (d == null) return null;
        return new DiplomaResponse(
                d.getId(), d.getName(), d.getUniversityName(), d.getDescription(),
                toDirectorDtos(d.getDirectors()),
                toCommissionDtos(d.getCommissions()),
                d.getActive(), d.getCreatedAt(), d.getUpdatedAt());
    }

    default List<CommissionResponse> toCommissionDtos(List<Course> commissions) {
        if (commissions == null) return List.of();
        return commissions.stream().map(this::toCommissionDto).toList();
    }

    default CommissionResponse toCommissionDto(Course c) {
        return new CommissionResponse(
                c.getId(), c.getName(), c.getCommission(), c.getAcademicYear(),
                c.getEnrollmentPrice(), c.getCoursePrice(), c.getIncludesPremaBook(),
                c.getStartDate(), c.getEndDate(), c.getModality(), c.getMoodleCourseId(),
                c.getActive());
    }

    default List<DirectorRefDto> toDirectorDtos(List<Staff> directors) {
        if (directors == null) return List.of();
        return directors.stream()
                .map(s -> new DirectorRefDto(
                        s.getId(),
                        (s.getLastName() + ", " + s.getFirstName()).trim(),
                        s.getEmail()))
                .toList();
    }
}
