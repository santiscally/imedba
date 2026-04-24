package com.imedba.modules.booksale.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record BookSaleResponse(
        UUID id,
        UUID bookId,
        String bookName,
        UUID studentId,
        UUID enrollmentId,
        Integer quantity,
        BigDecimal unitPrice,
        Boolean studentSale,
        BigDecimal totalAmount,
        Instant saleDate,
        UUID soldBy,
        String notes,
        Instant createdAt
) {}
