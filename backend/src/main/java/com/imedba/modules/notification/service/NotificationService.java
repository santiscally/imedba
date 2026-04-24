package com.imedba.modules.notification.service;

import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.notification.entity.Notification;
import com.imedba.modules.notification.entity.NotificationStatus;
import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.entity.RelatedEntityType;
import com.imedba.modules.notification.mail.MailSendException;
import com.imedba.modules.notification.mail.MailSender;
import com.imedba.modules.notification.repository.NotificationRepository;
import com.imedba.modules.notification.template.NotificationTemplate;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Encola notificaciones y las despacha vía {@link MailSender}. Es
 * append-only: no hay updates a mano desde el controller, sólo el dispatcher
 * muta el estado.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    /** Reintentos máximos antes de marcar FAILED. */
    public static final int MAX_ATTEMPTS = 3;

    /** Tope de ítems por tick del dispatcher. */
    public static final int DISPATCH_BATCH = 50;

    private final NotificationRepository repository;
    private final MailSender mailSender;

    /**
     * Idempotente por (type, relatedEntity*): si ya hay una activa/enviada para la
     * misma entidad, no se reencola. Devuelve la nueva (o la existente si se deduplicó).
     */
    @Transactional
    public Notification enqueue(
            NotificationType type,
            String recipientEmail,
            NotificationTemplate tpl,
            RelatedEntityType relatedEntityType,
            UUID relatedEntityId) {
        if (relatedEntityType != null && relatedEntityId != null) {
            boolean dup = repository.existsByTypeAndRelatedEntityTypeAndRelatedEntityIdAndStatusIn(
                    type, relatedEntityType, relatedEntityId,
                    List.of(NotificationStatus.QUEUED, NotificationStatus.SENT));
            if (dup) {
                log.debug("Notification duplicada ignorada: type={} entity={}:{}",
                        type, relatedEntityType, relatedEntityId);
                return repository.findAllByRelatedEntityTypeAndRelatedEntityId(
                        relatedEntityType, relatedEntityId).stream()
                        .filter(n -> n.getType() == type)
                        .findFirst().orElseThrow();
            }
        }

        Notification n = Notification.builder()
                .type(type)
                .status(NotificationStatus.QUEUED)
                .recipientEmail(recipientEmail)
                .subject(tpl.subject())
                .body(tpl.body())
                .relatedEntityType(relatedEntityType)
                .relatedEntityId(relatedEntityId)
                .scheduledFor(Instant.now())
                .attempts(0)
                .build();
        return repository.save(n);
    }

    /**
     * Procesa hasta {@link #DISPATCH_BATCH} notificaciones en cola. Cada envío corre
     * en su propio contexto transaccional implícito (save por ítem) — un fallo en una
     * no corta el lote.
     */
    @Transactional
    public int dispatchDueBatch() {
        List<Notification> due = repository.findDueForDispatch(
                Instant.now(), PageRequest.of(0, DISPATCH_BATCH));
        int sent = 0;
        for (Notification n : due) {
            try {
                mailSender.send(n.getRecipientEmail(), n.getSubject(), n.getBody());
                n.setStatus(NotificationStatus.SENT);
                n.setSentAt(Instant.now());
                n.setErrorMessage(null);
                sent++;
            } catch (MailSendException e) {
                n.setAttempts(n.getAttempts() + 1);
                n.setErrorMessage(truncate(e.getMessage(), 4000));
                if (n.getAttempts() >= MAX_ATTEMPTS) {
                    n.setStatus(NotificationStatus.FAILED);
                    log.warn("Notification FAILED tras {} intentos: id={} type={}",
                            n.getAttempts(), n.getId(), n.getType());
                } else {
                    log.info("Notification retry {}/{}: id={} type={} error={}",
                            n.getAttempts(), MAX_ATTEMPTS, n.getId(), n.getType(), e.getMessage());
                }
            }
            repository.save(n);
        }
        return sent;
    }

    @Transactional(readOnly = true)
    public Notification get(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Notification", id));
    }

    @Transactional
    public Notification retry(UUID id) {
        Notification n = get(id);
        if (n.getStatus() != NotificationStatus.FAILED) {
            throw new ConflictException("Sólo notifications FAILED pueden reintentarse");
        }
        n.setStatus(NotificationStatus.QUEUED);
        n.setAttempts(0);
        n.setErrorMessage(null);
        n.setScheduledFor(Instant.now());
        return repository.save(n);
    }

    @Transactional
    public Notification cancel(UUID id) {
        Notification n = get(id);
        if (n.getStatus() != NotificationStatus.QUEUED) {
            throw new ConflictException("Sólo notifications QUEUED pueden cancelarse");
        }
        n.setStatus(NotificationStatus.CANCELLED);
        return repository.save(n);
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
