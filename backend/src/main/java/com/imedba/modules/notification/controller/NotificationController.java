package com.imedba.modules.notification.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.modules.notification.dto.NotificationResponse;
import com.imedba.modules.notification.entity.NotificationStatus;
import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.mapper.NotificationMapper;
import com.imedba.modules.notification.repository.NotificationRepository;
import com.imedba.modules.notification.service.NotificationService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Acceso read-only al log de notificaciones, más acciones de mantenimiento
 * (reintentar FAILED, cancelar QUEUED). No expone alta manual — las
 * notificaciones se crean desde los servicios de dominio.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository repository;
    private final NotificationService service;
    private final NotificationMapper mapper;

    @GetMapping
    @PreAuthorize("hasAuthority('notifications:read')")
    public PageResponse<NotificationResponse> list(
            @RequestParam(required = false) NotificationStatus status,
            @RequestParam(required = false) NotificationType type,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<NotificationResponse> page;
        if (status != null && type != null) {
            page = repository.findAllByTypeAndStatus(type, status, pageable).map(mapper::toResponse);
        } else if (status != null) {
            page = repository.findAllByStatus(status, pageable).map(mapper::toResponse);
        } else {
            page = repository.findAll(pageable).map(mapper::toResponse);
        }
        return PageResponse.of(page);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('notifications:read')")
    public NotificationResponse get(@PathVariable UUID id) {
        return mapper.toResponse(service.get(id));
    }

    @PostMapping("/{id}/retry")
    @PreAuthorize("hasAuthority('notifications:write')")
    public NotificationResponse retry(@PathVariable UUID id) {
        return mapper.toResponse(service.retry(id));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('notifications:write')")
    public ResponseEntity<NotificationResponse> cancel(@PathVariable UUID id) {
        return ResponseEntity.ok(mapper.toResponse(service.cancel(id)));
    }
}
