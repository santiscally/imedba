package com.imedba.modules.diploma.mapper;

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
                d.getId(), d.getName(), d.getUniversityName(),
                d.getCourse() != null ? d.getCourse().getId() : null,
                d.getCourse() != null ? d.getCourse().getName() : null,
                d.getDescription(),
                d.getEnrollmentPrice(), d.getCoursePrice(),
                toDirectorDtos(d.getDirectors()),
                d.getActive(), d.getCreatedAt(), d.getUpdatedAt());
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
