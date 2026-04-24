package com.imedba.modules.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.imedba.modules.notification.entity.Notification;
import com.imedba.modules.notification.entity.NotificationStatus;
import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.entity.RelatedEntityType;
import com.imedba.modules.notification.mail.MailSendException;
import com.imedba.modules.notification.mail.MailSender;
import com.imedba.modules.notification.repository.NotificationRepository;
import com.imedba.modules.notification.service.NotificationService;
import com.imedba.modules.notification.template.NotificationTemplate;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

/**
 * Tests unitarios del ciclo enqueue → dispatch → retry/fail. Repo y MailSender son mocks.
 */
@ExtendWith(MockitoExtension.class)
class NotificationDispatchTests {

    @Mock private NotificationRepository repository;
    @Mock private MailSender mailSender;

    private NotificationService service;

    @BeforeEach
    void setUp() {
        service = new NotificationService(repository, mailSender);
        lenient().when(repository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("enqueue crea Notification QUEUED con scheduledFor = now y attempts = 0")
    void enqueue_creates_queued_row() {
        NotificationTemplate tpl = new NotificationTemplate("subj", "body");
        UUID entityId = UUID.randomUUID();

        Notification out = service.enqueue(
                NotificationType.WELCOME, "a@b.com", tpl,
                RelatedEntityType.ENROLLMENT, entityId);

        ArgumentCaptor<Notification> cap = ArgumentCaptor.forClass(Notification.class);
        verify(repository).save(cap.capture());
        Notification saved = cap.getValue();

        assertThat(saved.getType()).isEqualTo(NotificationType.WELCOME);
        assertThat(saved.getStatus()).isEqualTo(NotificationStatus.QUEUED);
        assertThat(saved.getRecipientEmail()).isEqualTo("a@b.com");
        assertThat(saved.getSubject()).isEqualTo("subj");
        assertThat(saved.getBody()).isEqualTo("body");
        assertThat(saved.getRelatedEntityType()).isEqualTo(RelatedEntityType.ENROLLMENT);
        assertThat(saved.getRelatedEntityId()).isEqualTo(entityId);
        assertThat(saved.getAttempts()).isZero();
        assertThat(saved.getScheduledFor()).isNotNull();
        assertThat(out).isSameAs(saved);
    }

    @Test
    @DisplayName("enqueue es idempotente por (type, relatedEntityType, relatedEntityId)")
    void enqueue_is_idempotent() {
        UUID entityId = UUID.randomUUID();
        Notification existing = Notification.builder()
                .type(NotificationType.PAYMENT_RECEIPT)
                .status(NotificationStatus.SENT)
                .recipientEmail("a@b.com")
                .subject("s").body("b")
                .relatedEntityType(RelatedEntityType.PAYMENT)
                .relatedEntityId(entityId)
                .attempts(0)
                .scheduledFor(Instant.now())
                .build();
        when(repository.existsByTypeAndRelatedEntityTypeAndRelatedEntityIdAndStatusIn(
                eq(NotificationType.PAYMENT_RECEIPT), eq(RelatedEntityType.PAYMENT),
                eq(entityId), any())).thenReturn(true);
        when(repository.findAllByRelatedEntityTypeAndRelatedEntityId(
                RelatedEntityType.PAYMENT, entityId)).thenReturn(List.of(existing));

        Notification out = service.enqueue(
                NotificationType.PAYMENT_RECEIPT, "a@b.com",
                new NotificationTemplate("s", "b"),
                RelatedEntityType.PAYMENT, entityId);

        assertThat(out).isSameAs(existing);
        verify(repository, org.mockito.Mockito.never()).save(any(Notification.class));
    }

    @Test
    @DisplayName("dispatch marca SENT y setea sentAt en éxito")
    void dispatch_marks_sent_on_success() {
        Notification n = pending("a@b.com", "s", "b");
        when(repository.findDueForDispatch(any(Instant.class), any(Pageable.class)))
                .thenReturn(List.of(n));
        doNothing().when(mailSender).send("a@b.com", "s", "b");

        int sent = service.dispatchDueBatch();

        assertThat(sent).isEqualTo(1);
        assertThat(n.getStatus()).isEqualTo(NotificationStatus.SENT);
        assertThat(n.getSentAt()).isNotNull();
        assertThat(n.getErrorMessage()).isNull();
    }

    @Test
    @DisplayName("dispatch: fallo incrementa attempts y deja QUEUED hasta MAX_ATTEMPTS")
    void dispatch_retries_until_max_attempts() {
        Notification n = pending("a@b.com", "s", "b");
        when(repository.findDueForDispatch(any(Instant.class), any(Pageable.class)))
                .thenReturn(List.of(n));
        doThrow(new MailSendException("boom")).when(mailSender).send(any(), any(), any());

        service.dispatchDueBatch();
        assertThat(n.getAttempts()).isEqualTo(1);
        assertThat(n.getStatus()).isEqualTo(NotificationStatus.QUEUED);
        assertThat(n.getErrorMessage()).isEqualTo("boom");

        service.dispatchDueBatch();
        assertThat(n.getAttempts()).isEqualTo(2);
        assertThat(n.getStatus()).isEqualTo(NotificationStatus.QUEUED);

        service.dispatchDueBatch();
        assertThat(n.getAttempts()).isEqualTo(NotificationService.MAX_ATTEMPTS);
        assertThat(n.getStatus()).isEqualTo(NotificationStatus.FAILED);
    }

    @Test
    @DisplayName("retry: FAILED vuelve a QUEUED con attempts=0")
    void retry_resets_failed_to_queued() {
        UUID id = UUID.randomUUID();
        Notification n = pending("a@b.com", "s", "b");
        n.setId(id);
        n.setStatus(NotificationStatus.FAILED);
        n.setAttempts(3);
        n.setErrorMessage("previous error");
        when(repository.findById(id)).thenReturn(java.util.Optional.of(n));

        Notification retried = service.retry(id);

        assertThat(retried.getStatus()).isEqualTo(NotificationStatus.QUEUED);
        assertThat(retried.getAttempts()).isZero();
        assertThat(retried.getErrorMessage()).isNull();
    }

    private static Notification pending(String to, String subject, String body) {
        return Notification.builder()
                .type(NotificationType.WELCOME)
                .status(NotificationStatus.QUEUED)
                .recipientEmail(to)
                .subject(subject).body(body)
                .attempts(0)
                .scheduledFor(Instant.now())
                .build();
    }
}
