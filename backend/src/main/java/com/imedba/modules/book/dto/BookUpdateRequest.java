package com.imedba.modules.book.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record BookUpdateRequest(
        @Size(max = 255) String name,
        @Size(max = 50) String code,
        @Size(max = 100) String specialty,
        @Size(max = 50) String format,
        @Size(max = 50) String edition,
        @Min(0) Integer pages,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal salePrice,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal studentDiscountPct,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal costPerUnit,
        @Min(0) Integer stockQuantity,
        @Size(max = 50) String branch,
        Boolean active
) {}
