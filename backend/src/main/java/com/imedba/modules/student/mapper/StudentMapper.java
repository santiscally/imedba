package com.imedba.modules.student.mapper;

import com.imedba.modules.student.dto.StudentCreateRequest;
import com.imedba.modules.student.dto.StudentResponse;
import com.imedba.modules.student.dto.StudentUpdateRequest;
import com.imedba.modules.student.entity.Student;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface StudentMapper {

    StudentResponse toResponse(Student s);

    Student toEntity(StudentCreateRequest req);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(StudentUpdateRequest req, @MappingTarget Student entity);
}
