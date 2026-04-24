package com.imedba.modules.installment.mapper;

import com.imedba.modules.installment.dto.InstallmentResponse;
import com.imedba.modules.installment.entity.Installment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface InstallmentMapper {

    @Mapping(target = "enrollmentId", source = "enrollment.id")
    @Mapping(target = "totalDue", expression = "java(i.totalDue())")
    InstallmentResponse toResponse(Installment i);
}
