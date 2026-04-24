package com.imedba.modules.booksale.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Línea de royalties calculada on-the-fly para un autor en un período.
 * totalSales = suma(total_amount) de ventas en el período para los libros del autor.
 * royaltyAmount = suma(total_amount * royalty_percentage) por (book, author).
 */
public record RoyaltyLineResponse(
        UUID authorId,
        String firstName,
        String lastName,
        UUID bookId,
        String bookName,
        BigDecimal royaltyPercentage,
        BigDecimal totalSales,
        BigDecimal royaltyAmount
) {}
