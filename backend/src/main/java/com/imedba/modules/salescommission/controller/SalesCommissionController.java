package com.imedba.modules.salescommission.controller;

import com.imedba.common.error.BadRequestException;
import com.imedba.modules.salescommission.dto.SalesCommissionDtos.CreateRequest;
import com.imedba.modules.salescommission.dto.SalesCommissionDtos.Response;
import com.imedba.modules.salescommission.dto.SalesCommissionDtos.SellerResponse;
import com.imedba.modules.salescommission.dto.SalesCommissionDtos.SummaryResponse;
import com.imedba.modules.salescommission.service.SalesCommissionEngine.Params;
import com.imedba.modules.salescommission.service.SalesCommissionService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
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

/**
 * Liquidación de comisiones de vendedora.
 *
 * <p>Permisos: {@code sales_commissions:read} / {@code sales_commissions:write}.
 * Deliberadamente separados de {@code students:*} — una vendedora no tiene por qué
 * ver lo que cobran las demás.
 */
@RestController
@RequestMapping("/api/v1/sales-commissions")
@RequiredArgsConstructor
public class SalesCommissionController {

    private final SalesCommissionService service;

    @GetMapping
    @PreAuthorize("hasAuthority('sales_commissions:read')")
    public List<SummaryResponse> list(
            @RequestParam(required = false) UUID sellerUserId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        if (sellerUserId != null) {
            return service.listBySeller(sellerUserId);
        }
        if (year != null && month != null) {
            return service.listByPeriod(year, month);
        }
        throw new BadRequestException("Indicá sellerUserId, o year + month");
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('sales_commissions:read')")
    public Response get(@PathVariable UUID id) {
        return service.get(id);
    }

    /**
     * Vendedores con ventas en el período, con el nombre ya resuelto — para poblar el
     * selector. {@code name} puede venir null si Keycloak admin está apagado; en ese
     * caso mostrar el id.
     */
    @GetMapping("/sellers")
    @PreAuthorize("hasAuthority('sales_commissions:read')")
    public List<SellerResponse> sellers(@RequestParam int year, @RequestParam int month) {
        return service.sellersWithActivity(year, month);
    }

    /** Calcula sin persistir: deja ver el número antes de crear el borrador. */
    @GetMapping("/preview")
    @PreAuthorize("hasAuthority('sales_commissions:read')")
    public Response preview(
            @RequestParam UUID sellerUserId,
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) BigDecimal tier1Rate,
            @RequestParam(required = false) BigDecimal tier2Rate,
            @RequestParam(required = false) BigDecimal booksRate,
            @RequestParam(required = false) Integer tierThreshold) {
        return service.preview(sellerUserId, year, month,
                new Params(tier1Rate, tier2Rate, booksRate, tierThreshold));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('sales_commissions:write')")
    public ResponseEntity<Response> create(@Valid @RequestBody CreateRequest req) {
        Response created = service.createDraft(req);
        return ResponseEntity.created(URI.create("/api/v1/sales-commissions/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}/recompute")
    @PreAuthorize("hasAuthority('sales_commissions:write')")
    public Response recompute(@PathVariable UUID id) {
        return service.recomputeDraft(id);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('sales_commissions:write')")
    public Response approve(@PathVariable UUID id) {
        return service.approve(id);
    }

    @PutMapping("/{id}/mark-paid")
    @PreAuthorize("hasAuthority('sales_commissions:write')")
    public Response markPaid(@PathVariable UUID id) {
        return service.markPaid(id);
    }

    /**
     * Comprobante en PDF. Sólo sale si la liquidación está pagada — es el respaldo
     * del pago, no un borrador (pedido 2026-08-03).
     */
    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAuthority('sales_commissions:read')")
    public ResponseEntity<byte[]> pdf(@PathVariable UUID id) {
        PdfFile f = service.renderPdf(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + f.filename() + "\"")
                .body(f.bytes());
    }
}
