package com.imedba.modules.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Builder.Default;
import org.hibernate.annotations.UuidGenerator;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Notificación (email) que vive en una máquina de estados QUEUED → SENT/FAILED/CANCELLED.
 * No extiende BaseEntity: no hay soft delete — las notificaciones son auditoría append-only.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "notifications")
@EntityListeners(AuditingEntityListener.class)
public class Notification {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 40)
    private NotificationType type;

    @Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private NotificationStatus status = NotificationStatus.QUEUED;

    @Column(name = "recipient_email", nullable = false, length = 255)
    private String recipientEmail;

    @Column(name = "subject", nullable = false, length = 500)
    private String subject;

    @Column(name = "body", nullable = false, columnDefinition = "text")
    private String body;

    @Column(name = "template_key", length = 100)
    private String templateKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "related_entity_type", length = 40)
    private RelatedEntityType relatedEntityType;

    @Column(name = "related_entity_id")
    private UUID relatedEntityId;

    @Default
    @Column(name = "scheduled_for", nullable = false)
    private Instant scheduledFor = Instant.now();

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Default
    @Column(name = "attempts", nullable = false)
    private Integer attempts = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Notification that)) return false;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
