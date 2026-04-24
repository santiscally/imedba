package com.imedba.modules.installment.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.modules.installment.dto.InstallmentResponse;
import com.imedba.modules.installment.dto.InstallmentUpdateRequest;
import com.imedba.modules.installment.entity.InstallmentStatus;
import com.imedba.modules.installment.service.InstallmentService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/installments")
@RequiredArgsConstructor
public class InstallmentController {

    private final InstallmentService service;

    @GetMapping
    @PreAuthorize("hasAuthority('installments:read')")
    public PageResponse<InstallmentResponse> list(
            @RequestParam(required = false) UUID enrollmentId,
            @RequestParam(required = false) InstallmentStatus status,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueFrom,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueTo,
            @PageableDefault(size = 20, sort = "dueDate") Pageable pageable) {
        return PageResponse.of(service.list(enrollmentId, status, dueFrom, dueTo, pageable));
    }

    @GetMapping("/by-enrollment/{enrollmentId}")
    @PreAuthorize("hasAuthority('installments:read')")
    public List<InstallmentResponse> byEnrollment(@PathVariable UUID enrollmentId) {
        return service.listByEnrollment(enrollmentId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('installments:read')")
    public InstallmentResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('installments:write')")
    public InstallmentResponse update(
            @PathVariable UUID id, @Valid @RequestBody InstallmentUpdateRequest req) {
        return service.update(id, req);
    }

    @PutMapping("/{id}/waive-surcharge")
    @PreAuthorize("hasAuthority('installments:write')")
    public InstallmentResponse waiveSurcharge(@PathVariable UUID id) {
        return service.waiveSurcharge(id);
    }
}
