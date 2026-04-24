package com.imedba.modules.staff.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.modules.staff.dto.StaffCreateRequest;
import com.imedba.modules.staff.dto.StaffResponse;
import com.imedba.modules.staff.dto.StaffUpdateRequest;
import com.imedba.modules.staff.entity.StaffType;
import com.imedba.modules.staff.service.StaffService;
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
@RequestMapping("/api/v1/staff")
@RequiredArgsConstructor
public class StaffController {

    private final StaffService service;

    @GetMapping
    @PreAuthorize("hasAuthority('staff:read')")
    public PageResponse<StaffResponse> list(
            @RequestParam(required = false) StaffType type,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "lastName") Pageable pageable) {
        return PageResponse.of(service.list(type, active, q, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('staff:read')")
    public StaffResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('staff:write')")
    public ResponseEntity<StaffResponse> create(@Valid @RequestBody StaffCreateRequest req) {
        StaffResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/staff/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('staff:write')")
    public StaffResponse update(@PathVariable UUID id,
                                @Valid @RequestBody StaffUpdateRequest req) {
        return service.update(id, req);
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('staff:write')")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
