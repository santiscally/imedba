package com.imedba.modules.payment.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.common.enums.PaymentMethod;
import com.imedba.modules.payment.dto.PaymentCreateRequest;
import com.imedba.modules.payment.dto.PaymentResponse;
import com.imedba.modules.payment.service.PaymentService;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
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
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService service;

    @GetMapping
    @PreAuthorize("hasAuthority('payments:read')")
    public PageResponse<PaymentResponse> list(
            @RequestParam(required = false) UUID enrollmentId,
            @RequestParam(required = false) UUID installmentId,
            @RequestParam(required = false) PaymentMethod method,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @PageableDefault(size = 20, sort = "paymentDate") Pageable pageable) {
        return PageResponse.of(service.list(enrollmentId, installmentId, method, from, to, pageable));
    }

    @GetMapping("/by-enrollment/{enrollmentId}")
    @PreAuthorize("hasAuthority('payments:read')")
    public List<PaymentResponse> byEnrollment(@PathVariable UUID enrollmentId) {
        return service.listByEnrollment(enrollmentId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('payments:read')")
    public PaymentResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('payments:write')")
    public ResponseEntity<PaymentResponse> register(@Valid @RequestBody PaymentCreateRequest req) {
        PaymentResponse p = service.register(req);
        return ResponseEntity.created(URI.create("/api/v1/payments/" + p.id())).body(p);
    }

    @PutMapping("/{id}/receipt-sent")
    @PreAuthorize("hasAuthority('payments:write')")
    public PaymentResponse markReceiptSent(
            @PathVariable UUID id,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant at) {
        return service.markReceiptSent(id, at);
    }
}
