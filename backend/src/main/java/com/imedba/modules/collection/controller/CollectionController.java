package com.imedba.modules.collection.controller;

import com.imedba.modules.booksale.dto.BookSaleResponse;
import com.imedba.modules.collection.dto.CollectionCreateRequest;
import com.imedba.modules.collection.dto.CollectionResponse;
import com.imedba.modules.collection.dto.CollectionSellRequest;
import com.imedba.modules.collection.service.CollectionService;
import com.imedba.modules.course.entity.BusinessUnit;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
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

/**
 * Colecciones de libros (reunión 2026-06-05). CRUD + venta de colección (genera N
 * book_sales repartiendo el precio por libro). Reusa las authorities de editorial:
 * {@code books:*} para el catálogo y {@code book_sales:write} para vender.
 */
@RestController
@RequestMapping("/api/v1/collections")
@RequiredArgsConstructor
public class CollectionController {

    private final CollectionService service;

    @GetMapping
    @PreAuthorize("hasAuthority('books:read')")
    public List<CollectionResponse> list(
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) BusinessUnit businessUnit) {
        return service.list(active, businessUnit);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('books:read')")
    public CollectionResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('books:write')")
    public ResponseEntity<CollectionResponse> create(@Valid @RequestBody CollectionCreateRequest req) {
        CollectionResponse c = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/collections/" + c.id())).body(c);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('books:write')")
    public CollectionResponse update(@PathVariable UUID id, @Valid @RequestBody CollectionCreateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('books:write')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** Vende la colección: genera una venta por libro con el precio repartido. */
    @PostMapping("/{id}/sell")
    @PreAuthorize("hasAuthority('book_sales:write')")
    public List<BookSaleResponse> sell(@PathVariable UUID id, @RequestBody CollectionSellRequest req) {
        return service.sell(id, req);
    }
}
