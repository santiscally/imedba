package com.imedba.modules.activitytype.mapper;

import com.imedba.modules.activitytype.dto.ActivityTypeCreateRequest;
import com.imedba.modules.activitytype.dto.ActivityTypeResponse;
import com.imedba.modules.activitytype.dto.ActivityTypeUpdateRequest;
import com.imedba.modules.activitytype.entity.ActivityType;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface ActivityTypeMapper {

    ActivityTypeResponse toResponse(ActivityType a);

    ActivityType toEntity(ActivityTypeCreateRequest req);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(ActivityTypeUpdateRequest req, @MappingTarget ActivityType entity);
}
