package com.imedba.modules.author.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.modules.author.dto.AuthorCreateRequest;
import com.imedba.modules.author.dto.AuthorResponse;
import com.imedba.modules.author.dto.AuthorUpdateRequest;
import com.imedba.modules.author.service.AuthorService;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/authors")
@RequiredArgsConstructor
public class AuthorController {

    private final AuthorService service;

    @GetMapping
    @PreAuthorize("hasAuthority('authors:read')")
    public PageResponse<AuthorResponse> list(
            @PageableDefault(size = 20, sort = "lastName") Pageable pageable) {
        return PageResponse.of(service.list(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('authors:read')")
    public AuthorResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('authors:write')")
    public ResponseEntity<AuthorResponse> create(@Valid @RequestBody AuthorCreateRequest req) {
        AuthorResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/authors/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('authors:write')")
    public AuthorResponse update(@PathVariable UUID id, @Valid @RequestBody AuthorUpdateRequest req) {
        return service.update(id, req);
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('authors:write')")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
