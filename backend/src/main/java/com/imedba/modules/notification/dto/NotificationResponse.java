package com.imedba.modules.notification.dto;

import com.imedba.modules.notification.entity.NotificationStatus;
import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.entity.RelatedEntityType;
import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        NotificationType type,
        NotificationStatus status,
        String recipientEmail,
        String subject,
        String body,
        RelatedEntityType relatedEntityType,
        UUID relatedEntityId,
        Instant scheduledFor,
        Instant sentAt,
        String errorMessage,
        Integer attempts,
        Instant createdAt,
        Instant updatedAt
) {}
