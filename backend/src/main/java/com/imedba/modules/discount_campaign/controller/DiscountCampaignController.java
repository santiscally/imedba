package com.imedba.modules.discount_campaign.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.modules.discount_campaign.dto.DiscountCampaignCreateRequest;
import com.imedba.modules.discount_campaign.dto.DiscountCampaignResponse;
import com.imedba.modules.discount_campaign.dto.DiscountCampaignUpdateRequest;
import com.imedba.modules.discount_campaign.service.DiscountCampaignService;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
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
@RequestMapping("/api/v1/discount-campaigns")
@RequiredArgsConstructor
public class DiscountCampaignController {

    private final DiscountCampaignService service;

    @GetMapping
    @PreAuthorize("hasAuthority('discount_campaigns:read')")
    public PageResponse<DiscountCampaignResponse> list(
            @PageableDefault(size = 20, sort = "startDate") Pageable pageable) {
        return PageResponse.of(service.list(pageable));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAuthority('discount_campaigns:read')")
    public List<DiscountCampaignResponse> listActive(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate on) {
        return service.listActive(on);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('discount_campaigns:read')")
    public DiscountCampaignResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('discount_campaigns:write')")
    public ResponseEntity<DiscountCampaignResponse> create(
            @Valid @RequestBody DiscountCampaignCreateRequest req) {
        DiscountCampaignResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/discount-campaigns/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('discount_campaigns:write')")
    public DiscountCampaignResponse update(
            @PathVariable UUID id, @Valid @RequestBody DiscountCampaignUpdateRequest req) {
        return service.update(id, req);
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('discount_campaigns:write')")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('discount_campaigns:write')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
