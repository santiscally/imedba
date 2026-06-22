package com.imedba.modules.course.mapper;

import com.imedba.modules.course.dto.CourseCreateRequest;
import com.imedba.modules.course.dto.CourseResponse;
import com.imedba.modules.course.dto.CourseUpdateRequest;
import com.imedba.modules.course.entity.Course;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface CourseMapper {

    CourseResponse toResponse(Course c);

    Course toEntity(CourseCreateRequest req);

    // commission con SET_NULL: pasar un curso de Formación Superior a otra unidad manda
    // commission=null y debe limpiarlo, no conservar el valor viejo (reunión 12-jun / review 06-22).
    @Mapping(target = "commission", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.SET_TO_NULL)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(CourseUpdateRequest req, @MappingTarget Course entity);
}
