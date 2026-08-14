package com.imedba.modules.diplomasettlement.controller;

import com.imedba.modules.diplomasettlement.dto.DiplomaSettlementCreateRequest;
import com.imedba.modules.diplomasettlement.dto.DiplomaSettlementResponse;
import com.imedba.modules.diplomasettlement.service.DiplomaSettlementService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import com.imedba.common.pdf.PdfFile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
@RequestMapping("/api/v1/diploma-settlements")
@RequiredArgsConstructor
public class DiplomaSettlementController {

    private final DiplomaSettlementService service;

    @GetMapping
    @PreAuthorize("hasAuthority('diplomas:read')")
    public List<DiplomaSettlementResponse> listByDiploma(@RequestParam UUID diplomaId) {
        return service.listByDiploma(diplomaId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('diplomas:read')")
    public DiplomaSettlementResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('diplomas:write')")
    public ResponseEntity<DiplomaSettlementResponse> create(
            @Valid @RequestBody DiplomaSettlementCreateRequest req) {
        DiplomaSettlementResponse created = service.createDraft(req);
        return ResponseEntity.created(URI.create("/api/v1/diploma-settlements/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}/recompute")
    @PreAuthorize("hasAuthority('diplomas:write')")
    public DiplomaSettlementResponse recompute(@PathVariable UUID id) {
        return service.recomputeDraft(id);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('diplomas:write')")
    public DiplomaSettlementResponse approve(@PathVariable UUID id) {
        return service.approve(id);
    }

    @PutMapping("/{id}/mark-paid")
    @PreAuthorize("hasAuthority('diplomas:write')")
    public DiplomaSettlementResponse markPaid(@PathVariable UUID id) {
        return service.markPaid(id);
    }

    /**
     * Comprobante en PDF. Sólo sale si la liquidación está pagada — es el respaldo
     * del pago, no un borrador (pedido 2026-08-03).
     */
    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAuthority('settlements:read')")
    public ResponseEntity<byte[]> pdf(@PathVariable UUID id) {
        PdfFile f = service.renderPdf(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + f.filename() + "\"")
                .body(f.bytes());
    }
}
