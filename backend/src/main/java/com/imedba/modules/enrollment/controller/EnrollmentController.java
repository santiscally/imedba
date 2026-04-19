package com.imedba.modules.enrollment.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.modules.enrollment.dto.EnrollmentCreateRequest;
import com.imedba.modules.enrollment.dto.EnrollmentResponse;
import com.imedba.modules.enrollment.dto.EnrollmentUpdateRequest;
import com.imedba.modules.enrollment.entity.EnrollmentStatus;
import com.imedba.modules.enrollment.service.EnrollmentService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentService service;

    @GetMapping
    @PreAuthorize("hasAuthority('enrollments:read')")
    public PageResponse<EnrollmentResponse> list(
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) EnrollmentStatus status,
            @PageableDefault(size = 20, sort = "enrollmentDate") Pageable pageable) {
        return PageResponse.of(service.list(studentId, courseId, status, pageable));
    }

    /** Inscripciones cargadas por el usuario autenticado (pensado para vendedoras). */
    @GetMapping("/my")
    @PreAuthorize("hasAuthority('enrollments:read')")
    public PageResponse<EnrollmentResponse> listMine(
            @RequestParam(required = false) EnrollmentStatus status,
            @PageableDefault(size = 20, sort = "enrollmentDate") Pageable pageable) {
        return PageResponse.of(service.listMine(status, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('enrollments:read')")
    public EnrollmentResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('enrollments:write')")
    public ResponseEntity<EnrollmentResponse> create(@Valid @RequestBody EnrollmentCreateRequest req) {
        EnrollmentResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/enrollments/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('enrollments:write')")
    public EnrollmentResponse update(
            @PathVariable UUID id, @Valid @RequestBody EnrollmentUpdateRequest req) {
        return service.update(id, req);
    }

    @PutMapping("/{id}/suspend")
    @PreAuthorize("hasAuthority('enrollments:write')")
    public EnrollmentResponse suspend(@PathVariable UUID id) {
        return service.suspend(id);
    }

    @PutMapping("/{id}/reactivate")
    @PreAuthorize("hasAuthority('enrollments:write')")
    public EnrollmentResponse reactivate(@PathVariable UUID id) {
        return service.reactivate(id);
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('enrollments:write')")
    public EnrollmentResponse cancel(@PathVariable UUID id) {
        return service.cancel(id);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('enrollments:write')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
