package com.imedba.modules.book.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BookResponse(
        UUID id,
        String name,
        String code,
        String specialty,
        String format,
        String edition,
        Integer pages,
        BigDecimal salePrice,
        BigDecimal studentDiscountPct,
        BigDecimal costPerUnit,
        Integer stockQuantity,
        String branch,
        Boolean active,
        List<BookAuthorResponse> authors,
        Instant createdAt,
        Instant updatedAt
) {}
