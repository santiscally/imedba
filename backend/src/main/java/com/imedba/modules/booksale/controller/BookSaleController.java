package com.imedba.modules.booksale.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.modules.booksale.dto.BookSaleCreateRequest;
import com.imedba.modules.booksale.dto.BookSaleResponse;
import com.imedba.modules.booksale.dto.RoyaltyLineResponse;
import com.imedba.modules.booksale.service.BookSaleService;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/book-sales")
@RequiredArgsConstructor
public class BookSaleController {

    private final BookSaleService service;

    @GetMapping
    @PreAuthorize("hasAuthority('book_sales:read')")
    public PageResponse<BookSaleResponse> list(
            @RequestParam(required = false) UUID bookId,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) UUID enrollmentId,
            @RequestParam(required = false) UUID soldBy,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @PageableDefault(size = 20, sort = "saleDate") Pageable pageable) {
        return PageResponse.of(
                service.list(bookId, studentId, enrollmentId, soldBy, from, to, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('book_sales:read')")
    public BookSaleResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('book_sales:write')")
    public ResponseEntity<BookSaleResponse> create(@Valid @RequestBody BookSaleCreateRequest req) {
        BookSaleResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/book-sales/" + created.id()))
                .body(created);
    }

    @GetMapping("/royalties/by-period")
    @PreAuthorize("hasAuthority('book_sales:read')")
    public List<RoyaltyLineResponse> royaltiesByPeriod(
            @RequestParam int year,
            @RequestParam int month) {
        return service.royaltiesByPeriod(year, month);
    }
}
