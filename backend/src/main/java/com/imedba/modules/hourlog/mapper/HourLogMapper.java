package com.imedba.modules.hourlog.mapper;

import com.imedba.modules.hourlog.dto.HourLogResponse;
import com.imedba.modules.hourlog.entity.HourLog;
import com.imedba.modules.staff.entity.Staff;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface HourLogMapper {

    @Mapping(target = "staffId", source = "staff.id")
    @Mapping(target = "staffName", source = "staff", qualifiedByName = "staffDisplayName")
    HourLogResponse toResponse(HourLog h);

    @Named("staffDisplayName")
    default String staffDisplayName(Staff s) {
        if (s == null) return null;
        String first = s.getFirstName() == null ? "" : s.getFirstName();
        String last = s.getLastName() == null ? "" : s.getLastName();
        return (first + " " + last).trim();
    }
}
