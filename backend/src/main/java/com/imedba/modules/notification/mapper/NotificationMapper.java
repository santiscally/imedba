package com.imedba.modules.notification.mapper;

import com.imedba.modules.notification.dto.NotificationResponse;
import com.imedba.modules.notification.entity.Notification;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface NotificationMapper {
    NotificationResponse toResponse(Notification entity);
}
