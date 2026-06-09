package com.imedba.modules.collection.dto;

import com.imedba.modules.collection.entity.CollectionVariant;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CollectionResponse(
        UUID id,
        String name,
        CollectionVariant variant,
        BigDecimal price,
        BigDecimal studentDiscountPct,
        Boolean active,
        List<BookSummary> books,
        Instant createdAt,
        Instant updatedAt
) {
    public record BookSummary(UUID id, String name, String code, BigDecimal salePrice) {}
}
