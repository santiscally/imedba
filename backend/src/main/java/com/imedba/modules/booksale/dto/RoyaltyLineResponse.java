package com.imedba.modules.booksale.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Línea de royalties calculada on-the-fly para un autor en un período.
 * totalSales = suma(total_amount) de ventas en el período para los libros del autor.
 * royaltyAmount = totalSales * (royaltyPoolPct/100) * (royaltyPercentage/100):
 * el pool del libro (default 10% de la venta) se reparte entre autoras según
 * su royalty_percentage (doc 09 §3.4).
 */
public record RoyaltyLineResponse(
        UUID authorId,
        String firstName,
        String lastName,
        UUID bookId,
        String bookName,
        BigDecimal royaltyPercentage,
        BigDecimal royaltyPoolPct,
        BigDecimal totalSales,
        BigDecimal royaltyAmount
) {}
