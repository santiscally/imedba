package com.imedba.modules.staff.mapper;

import com.imedba.modules.staff.dto.StaffCreateRequest;
import com.imedba.modules.staff.dto.StaffResponse;
import com.imedba.modules.staff.dto.StaffUpdateRequest;
import com.imedba.modules.staff.entity.Staff;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface StaffMapper {

    StaffResponse toResponse(Staff s);

    Staff toEntity(StaffCreateRequest req);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(StaffUpdateRequest req, @MappingTarget Staff entity);
}
