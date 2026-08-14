package com.imedba.modules.teaching.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.common.error.BadRequestException;
import com.imedba.modules.teaching.dto.TeachingDtos.ClassSessionRequest;
import com.imedba.modules.teaching.dto.TeachingDtos.ClassSessionResponse;
import com.imedba.modules.teaching.dto.TeachingDtos.CreateRequest;
import com.imedba.modules.teaching.dto.TeachingDtos.HoursToPayRequest;
import com.imedba.modules.teaching.dto.TeachingDtos.Response;
import com.imedba.modules.teaching.dto.TeachingDtos.SummaryResponse;
import com.imedba.modules.teaching.dto.TeachingDtos.TeachingCandidate;
import com.imedba.modules.teaching.entity.TeachingRole;
import com.imedba.modules.teaching.service.ClassSessionService;
import com.imedba.modules.teaching.service.TeachingSettlementService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import com.imedba.common.pdf.PdfFile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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

/**
 * Grilla de clases + liquidación de horas docentes y de preceptoría (V037).
 *
 * <p>Permisos: la grilla usa {@code hour_logs:*} (misma gente que ya cargaba
 * horas); la liquidación usa {@code settlements:*}.
 */
@RestController
@RequestMapping("/api/v1/teaching")
@RequiredArgsConstructor
public class TeachingController {

    private final ClassSessionService sessionService;
    private final TeachingSettlementService settlementService;

    // ─── Grilla de clases ────────────────────────────────────────────────────

    @GetMapping("/sessions")
    @PreAuthorize("hasAuthority('hour_logs:read')")
    public PageResponse<ClassSessionResponse> listSessions(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) UUID teacherId,
            @RequestParam(required = false) UUID preceptorId,
            @RequestParam(required = false) Boolean synchronous,
            @RequestParam(required = false) String commission,
            @PageableDefault(size = 50, sort = "sessionDate") Pageable pageable) {
        return PageResponse.of(sessionService.list(
                year, month, teacherId, preceptorId, synchronous, commission, pageable));
    }

    @GetMapping("/sessions/{id}")
    @PreAuthorize("hasAuthority('hour_logs:read')")
    public ClassSessionResponse getSession(@PathVariable UUID id) {
        return sessionService.get(id);
    }

    @PostMapping("/sessions")
    @PreAuthorize("hasAuthority('hour_logs:write')")
    public ResponseEntity<ClassSessionResponse> createSession(
            @Valid @RequestBody ClassSessionRequest req) {
        ClassSessionResponse created = sessionService.create(req);
        return ResponseEntity
                .created(URI.create("/api/v1/teaching/sessions/" + created.id()))
                .body(created);
    }

    @PutMapping("/sessions/{id}")
    @PreAuthorize("hasAuthority('hour_logs:write')")
    public ClassSessionResponse updateSession(
            @PathVariable UUID id, @Valid @RequestBody ClassSessionRequest req) {
        return sessionService.update(id, req);
    }

    /** Confirma las horas a pagar de varias clases de una — el cierre de mes de Cobranzas. */
    @PutMapping("/sessions/hours-to-pay")
    @PreAuthorize("hasAuthority('hour_logs:write')")
    public Map<String, Integer> setHoursToPay(@Valid @RequestBody List<HoursToPayRequest> items) {
        return Map.of("updated", sessionService.setHoursToPay(items));
    }

    @DeleteMapping("/sessions/{id}")
    @PreAuthorize("hasAuthority('hour_logs:write')")
    public ResponseEntity<Void> deleteSession(@PathVariable UUID id) {
        sessionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Liquidación ─────────────────────────────────────────────────────────

    /** Quiénes tienen clases en el período y si ya se les liquidó. */
    @GetMapping("/settlements/candidates")
    @PreAuthorize("hasAuthority('settlements:read')")
    public List<TeachingCandidate> candidates(
            @RequestParam int year, @RequestParam int month) {
        return settlementService.candidates(year, month);
    }

    /** Calcula sin persistir: deja ver el número antes de generar el borrador. */
    @GetMapping("/settlements/preview")
    @PreAuthorize("hasAuthority('settlements:read')")
    public Response preview(
            @RequestParam UUID staffId,
            @RequestParam TeachingRole role,
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) BigDecimal hourlyRate) {
        return settlementService.preview(staffId, role, year, month, hourlyRate);
    }

    @GetMapping("/settlements")
    @PreAuthorize("hasAuthority('settlements:read')")
    public List<SummaryResponse> listSettlements(
            @RequestParam(required = false) UUID staffId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        if (staffId != null) return settlementService.listByStaff(staffId);
        if (year != null && month != null) return settlementService.listByPeriod(year, month);
        throw new BadRequestException("Indicá staffId, o year + month");
    }

    @GetMapping("/settlements/{id}")
    @PreAuthorize("hasAuthority('settlements:read')")
    public Response getSettlement(@PathVariable UUID id) {
        return settlementService.get(id);
    }

    @PostMapping("/settlements")
    @PreAuthorize("hasAuthority('settlements:write')")
    public ResponseEntity<Response> createSettlement(@Valid @RequestBody CreateRequest req) {
        Response created = settlementService.createDraft(req);
        return ResponseEntity
                .created(URI.create("/api/v1/teaching/settlements/" + created.id()))
                .body(created);
    }

    @PutMapping("/settlements/{id}/recompute")
    @PreAuthorize("hasAuthority('settlements:write')")
    public Response recompute(@PathVariable UUID id) {
        return settlementService.recomputeDraft(id);
    }

    @PutMapping("/settlements/{id}/approve")
    @PreAuthorize("hasAuthority('settlements:write')")
    public Response approve(@PathVariable UUID id) {
        return settlementService.approve(id);
    }

    @PutMapping("/settlements/{id}/invoice-sent")
    @PreAuthorize("hasAuthority('settlements:write')")
    public Response markInvoiceSent(@PathVariable UUID id) {
        return settlementService.markInvoiceSent(id);
    }

    @PutMapping("/settlements/{id}/invoice-received")
    @PreAuthorize("hasAuthority('settlements:write')")
    public Response markInvoiceReceived(@PathVariable UUID id) {
        return settlementService.markInvoiceReceived(id);
    }

    @PutMapping("/settlements/{id}/mark-paid")
    @PreAuthorize("hasAuthority('settlements:write')")
    public Response markPaid(@PathVariable UUID id) {
        return settlementService.markPaid(id);
    }

    /**
     * Comprobante en PDF. Sólo sale si la liquidación está pagada — es el respaldo
     * del pago, no un borrador (pedido 2026-08-03).
     */
    @GetMapping("/settlements/{id}/pdf")
    @PreAuthorize("hasAuthority('teaching:read')")
    public ResponseEntity<byte[]> pdf(@PathVariable UUID id) {
        PdfFile f = settlementService.renderPdf(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + f.filename() + "\"")
                .body(f.bytes());
    }
}
