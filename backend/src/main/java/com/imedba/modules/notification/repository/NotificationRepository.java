package com.imedba.modules.notification.repository;

import com.imedba.modules.notification.entity.Notification;
import com.imedba.modules.notification.entity.NotificationStatus;
import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.entity.RelatedEntityType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    /** Cola del dispatcher: QUEUED cuyo scheduled_for ya pasó, más viejos primero. */
    @Query("""
            SELECT n FROM Notification n
            WHERE n.status = 'QUEUED' AND n.scheduledFor <= :now
            ORDER BY n.scheduledFor ASC
            """)
    List<Notification> findDueForDispatch(@Param("now") Instant now, Pageable pageable);

    Page<Notification> findAllByStatus(NotificationStatus status, Pageable pageable);

    Page<Notification> findAllByTypeAndStatus(NotificationType type, NotificationStatus status, Pageable pageable);

    List<Notification> findAllByRelatedEntityTypeAndRelatedEntityId(
            RelatedEntityType relatedEntityType, UUID relatedEntityId);

    /** Evita duplicados: ya hay una notificación de este tipo para esta entidad en estos estados. */
    boolean existsByTypeAndRelatedEntityTypeAndRelatedEntityIdAndStatusIn(
            NotificationType type,
            RelatedEntityType relatedEntityType,
            UUID relatedEntityId,
            List<NotificationStatus> statuses);
}
