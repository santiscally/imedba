package com.imedba.modules.contact.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.modules.contact.dto.ContactCreateRequest;
import com.imedba.modules.contact.dto.ContactResponse;
import com.imedba.modules.contact.dto.ContactUpdateRequest;
import com.imedba.modules.contact.entity.ContactType;
import com.imedba.modules.contact.service.ContactService;
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
@RequestMapping("/api/v1/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService service;

    @GetMapping
    @PreAuthorize("hasAuthority('contacts:read')")
    public PageResponse<ContactResponse> list(
            @RequestParam(required = false) ContactType type,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "lastName") Pageable pageable) {
        return PageResponse.of(service.list(type, active, q, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('contacts:read')")
    public ContactResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('contacts:write')")
    public ResponseEntity<ContactResponse> create(@Valid @RequestBody ContactCreateRequest req) {
        ContactResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/contacts/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('contacts:write')")
    public ContactResponse update(@PathVariable UUID id,
                                  @Valid @RequestBody ContactUpdateRequest req) {
        return service.update(id, req);
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('contacts:write')")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
