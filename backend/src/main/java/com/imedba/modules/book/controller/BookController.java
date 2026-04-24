package com.imedba.modules.book.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.modules.book.dto.BookAuthorRequest;
import com.imedba.modules.book.dto.BookCreateRequest;
import com.imedba.modules.book.dto.BookResponse;
import com.imedba.modules.book.dto.BookUpdateRequest;
import com.imedba.modules.book.service.BookService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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
@RequestMapping("/api/v1/books")
@RequiredArgsConstructor
public class BookController {

    private final BookService service;

    @GetMapping
    @PreAuthorize("hasAuthority('books:read')")
    public PageResponse<BookResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return PageResponse.of(service.list(q, specialty, branch, active, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('books:read')")
    public BookResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('books:write')")
    public ResponseEntity<BookResponse> create(@Valid @RequestBody BookCreateRequest req) {
        BookResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/books/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('books:write')")
    public BookResponse update(@PathVariable UUID id, @Valid @RequestBody BookUpdateRequest req) {
        return service.update(id, req);
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('books:write')")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/authors")
    @PreAuthorize("hasAuthority('books:write')")
    public BookResponse addAuthor(@PathVariable UUID id, @Valid @RequestBody BookAuthorRequest req) {
        return service.addAuthor(id, req);
    }

    @DeleteMapping("/{id}/authors/{authorId}")
    @PreAuthorize("hasAuthority('books:write')")
    public ResponseEntity<Void> removeAuthor(@PathVariable UUID id, @PathVariable UUID authorId) {
        service.removeAuthor(id, authorId);
        return ResponseEntity.noContent().build();
    }
}
