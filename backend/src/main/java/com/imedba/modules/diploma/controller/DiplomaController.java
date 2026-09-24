package com.imedba.modules.diploma.controller;

import com.imedba.modules.diploma.dto.CommissionRequest;
import com.imedba.modules.diploma.dto.CommissionResponse;
import com.imedba.modules.diploma.dto.DiplomaCreateRequest;
import com.imedba.modules.diploma.dto.DiplomaResponse;
import com.imedba.modules.diploma.dto.DiplomaUpdateRequest;
import com.imedba.modules.diploma.service.DiplomaService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/v1/diplomas")
@RequiredArgsConstructor
public class DiplomaController {

    private final DiplomaService service;

    @GetMapping
    @PreAuthorize("hasAuthority('diplomas:read')")
    public List<DiplomaResponse> list(@RequestParam(required = false) Boolean onlyActive) {
        return service.list(onlyActive);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('diplomas:read')")
    public DiplomaResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('diplomas:write')")
    public ResponseEntity<DiplomaResponse> create(@Valid @RequestBody DiplomaCreateRequest req) {
        DiplomaResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/diplomas/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('diplomas:write')")
    public DiplomaResponse update(@PathVariable UUID id,
                                  @Valid @RequestBody DiplomaUpdateRequest req) {
        return service.update(id, req);
    }

    @PostMapping("/{id}/commissions")
    @PreAuthorize("hasAuthority('diplomas:write')")
    public ResponseEntity<CommissionResponse> createCommission(@PathVariable UUID id,
                                                               @Valid @RequestBody CommissionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createCommission(id, req));
    }

    @PutMapping("/{id}/commissions/{courseId}")
    @PreAuthorize("hasAuthority('diplomas:write')")
    public CommissionResponse updateCommission(@PathVariable UUID id, @PathVariable UUID courseId,
                                               @Valid @RequestBody CommissionRequest req) {
        return service.updateCommission(id, courseId, req);
    }

    @DeleteMapping("/{id}/commissions/{courseId}")
    @PreAuthorize("hasAuthority('diplomas:write')")
    public ResponseEntity<Void> deleteCommission(@PathVariable UUID id, @PathVariable UUID courseId) {
        service.deleteCommission(id, courseId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('diplomas:write')")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
