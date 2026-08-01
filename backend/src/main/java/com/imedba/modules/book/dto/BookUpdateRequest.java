package com.imedba.modules.book.dto;

import com.imedba.modules.course.entity.BusinessUnit;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * El stock NO se edita por acá: las ventas lo descuentan solas y un PUT con el valor
 * stale del form lo pisaba (bug testeo integral 2026-06-09). Ajustes manuales de stock:
 * {@code PUT /books/{id}/stock} con {@link BookStockUpdateRequest}.
 */
public record BookUpdateRequest(
        @Size(max = 255) String name,
        /** Unidad en la que se ofrece (V036). null = todas. */
        BusinessUnit businessUnit,
        @Size(max = 50) String code,
        @Size(max = 100) String specialty,
        @Size(max = 50) String format,
        @Size(max = 50) String edition,
        @Min(0) Integer pages,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal salePrice,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal studentDiscountPct,
        @DecimalMin(value = "0.00", inclusive = true)
        @DecimalMax(value = "100.00") BigDecimal royaltyPoolPct,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal costPerUnit,
        @Size(max = 50) String branch,
        Boolean active
) {}
