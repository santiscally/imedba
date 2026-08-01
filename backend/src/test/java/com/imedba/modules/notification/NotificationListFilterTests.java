package com.imedba.modules.notification;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.imedba.modules.notification.controller.NotificationController;
import com.imedba.modules.notification.entity.Notification;
import com.imedba.modules.notification.entity.NotificationStatus;
import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.mail.MailSender;
import com.imedba.modules.notification.mapper.NotificationMapper;
import com.imedba.modules.notification.repository.NotificationRepository;
import com.imedba.modules.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/**
 * Fija las 4 combinaciones de filtros de {@code GET /notifications}.
 *
 * <p>Existe por un bug real: el {@code if/else} tenía rama para {@code status} y
 * para {@code status+type}, pero <b>no para {@code type} solo</b> — así que pasar
 * únicamente el tipo caía en el {@code findAll} y devolvía todo el historial
 * ignorando el filtro que la API publica. Se descubrió recién al consultar la
 * tabla desde afuera; ningún test cubría este endpoint.
 */
class NotificationListFilterTests {

    private NotificationRepository repository;
    private NotificationController controller;
    private final Pageable pageable = PageRequest.of(0, 20);
    private final Page<Notification> empty = new PageImpl<>(java.util.List.of());

    @BeforeEach
    void setUp() {
        repository = mock(NotificationRepository.class);
        controller = new NotificationController(
                repository,
                mock(NotificationService.class),
                mock(NotificationMapper.class),
                mock(MailSender.class));
        when(repository.findAll(any(Pageable.class))).thenReturn(empty);
        when(repository.findAllByType(any(), any())).thenReturn(empty);
        when(repository.findAllByStatus(any(), any())).thenReturn(empty);
        when(repository.findAllByTypeAndStatus(any(), any(), any())).thenReturn(empty);
    }

    @Test
    @DisplayName("Sólo type: filtra por tipo (la rama que faltaba)")
    void solo_type() {
        controller.list(null, NotificationType.TEACHING_INVOICE_REQUEST, pageable);

        verify(repository).findAllByType(NotificationType.TEACHING_INVOICE_REQUEST, pageable);
        // Lo que hacía antes del fix: devolver todo.
        verify(repository, never()).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("Sólo status: filtra por estado")
    void solo_status() {
        controller.list(NotificationStatus.QUEUED, null, pageable);

        verify(repository).findAllByStatus(NotificationStatus.QUEUED, pageable);
        verify(repository, never()).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("Los dos: filtra por tipo y estado")
    void ambos() {
        controller.list(NotificationStatus.SENT, NotificationType.SETTLEMENT_APPROVED, pageable);

        verify(repository).findAllByTypeAndStatus(
                NotificationType.SETTLEMENT_APPROVED, NotificationStatus.SENT, pageable);
    }

    @Test
    @DisplayName("Ninguno: devuelve todo, que es lo correcto sin filtros")
    void ninguno() {
        controller.list(null, null, pageable);

        verify(repository).findAll(pageable);
    }
}
