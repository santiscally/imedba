package com.imedba.modules.hourlog.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.modules.hourlog.dto.HourLogCreateRequest;
import com.imedba.modules.hourlog.dto.HourLogResponse;
import com.imedba.modules.hourlog.entity.PaymentStatus;
import com.imedba.modules.hourlog.service.HourLogService;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.Instant;
import java.util.Map;
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
@RequestMapping("/api/v1/hour-logs")
@RequiredArgsConstructor
public class HourLogController {

    private final HourLogService service;

    @GetMapping
    @PreAuthorize("hasAuthority('hour_logs:read')")
    public PageResponse<HourLogResponse> list(
            @RequestParam(required = false) UUID staffId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(required = false) String activityType,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return PageResponse.of(service.list(staffId, year, month, status, activityType, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('hour_logs:read')")
    public HourLogResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('hour_logs:write')")
    public ResponseEntity<HourLogResponse> create(@Valid @RequestBody HourLogCreateRequest req) {
        HourLogResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/hour-logs/" + created.id())).body(created);
    }

    @PutMapping("/{id}/invoice-sent")
    @PreAuthorize("hasAuthority('hour_logs:write')")
    public HourLogResponse markInvoiceSent(@PathVariable UUID id,
                                           @RequestParam(required = false) Instant at) {
        return service.markInvoiceSent(id, at);
    }

    @PutMapping("/{id}/invoice-received")
    @PreAuthorize("hasAuthority('hour_logs:write')")
    public HourLogResponse markInvoiceReceived(@PathVariable UUID id,
                                               @RequestBody(required = false) Map<String, String> body) {
        String filePath = body == null ? null : body.get("invoiceFilePath");
        return service.markInvoiceReceived(id, filePath);
    }

    @PutMapping("/{id}/mark-paid")
    @PreAuthorize("hasAuthority('hour_logs:write')")
    public HourLogResponse markPaid(@PathVariable UUID id,
                                    @RequestParam(required = false) Instant paidAt) {
        return service.markPaid(id, paidAt);
    }
}
