package com.imedba.modules.book.dto;

import com.imedba.modules.course.entity.BusinessUnit;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BookResponse(
        UUID id,
        String name,
        /** Unidad en la que se ofrece (V036). null = todas. */
        BusinessUnit businessUnit,
        String code,
        String specialty,
        String format,
        String edition,
        Integer pages,
        BigDecimal salePrice,
        BigDecimal studentDiscountPct,
        BigDecimal royaltyPoolPct,
        BigDecimal costPerUnit,
        Integer stockQuantity,
        String branch,
        Boolean active,
        List<BookAuthorResponse> authors,
        Instant createdAt,
        Instant updatedAt
) {}
