package com.imedba.modules.enrollment.mapper;

import com.imedba.modules.enrollment.dto.EnrollmentResponse;
import com.imedba.modules.enrollment.dto.EnrollmentUpdateRequest;
import com.imedba.modules.enrollment.entity.Enrollment;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface EnrollmentMapper {

    @Mapping(target = "student", source = "student")
    @Mapping(target = "course", source = "course")
    EnrollmentResponse toResponse(Enrollment e);

    /**
     * Update parcial. No se actualizan: student, course, status, prices calculados (finalPrice/totalPrice)
     * ni campos auditados. El servicio maneja la transición de estado y el recálculo de precios.
     */
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "student", ignore = true)
    @Mapping(target = "course", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "finalPrice", ignore = true)
    @Mapping(target = "totalPrice", ignore = true)
    @Mapping(target = "enrolledBy", ignore = true)
    @Mapping(target = "enrollmentDate", ignore = true)
    @Mapping(target = "moodleStatus", ignore = true)
    void updateEntity(EnrollmentUpdateRequest req, @MappingTarget Enrollment entity);
}
