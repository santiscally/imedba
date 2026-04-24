package com.imedba.modules.diplomaenrollment.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.modules.diplomaenrollment.dto.DiplomaEnrollmentCreateRequest;
import com.imedba.modules.diplomaenrollment.dto.DiplomaEnrollmentResponse;
import com.imedba.modules.diplomaenrollment.dto.DiplomaEnrollmentUpdateRequest;
import com.imedba.modules.diplomaenrollment.entity.DiplomaEnrollmentStatus;
import com.imedba.modules.diplomaenrollment.service.DiplomaEnrollmentService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/diploma-enrollments")
@RequiredArgsConstructor
public class DiplomaEnrollmentController {

    private final DiplomaEnrollmentService service;

    @GetMapping
    @PreAuthorize("hasAuthority('diplomas:read')")
    public PageResponse<DiplomaEnrollmentResponse> list(
            @RequestParam(required = false) UUID diplomaId,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) DiplomaEnrollmentStatus status,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return PageResponse.of(service.list(diplomaId, studentId, status, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('diplomas:read')")
    public DiplomaEnrollmentResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('diplomas:write')")
    public ResponseEntity<DiplomaEnrollmentResponse> create(
            @Valid @RequestBody DiplomaEnrollmentCreateRequest req) {
        DiplomaEnrollmentResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/diploma-enrollments/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('diplomas:write')")
    public DiplomaEnrollmentResponse update(@PathVariable UUID id,
                                            @Valid @RequestBody DiplomaEnrollmentUpdateRequest req) {
        return service.update(id, req);
    }
}
