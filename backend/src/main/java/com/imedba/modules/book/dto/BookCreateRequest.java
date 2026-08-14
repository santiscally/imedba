package com.imedba.modules.book.dto;

import com.imedba.modules.course.entity.BusinessUnit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record BookCreateRequest(
        @NotBlank @Size(max = 255) String name,
        /** Unidad en la que se ofrece (V036). null = todas. */
        BusinessUnit businessUnit,
        @Size(max = 50) String code,
        @Size(max = 100) String specialty,
        @Size(max = 50) String format,
        @Size(max = 50) String edition,
        @Min(0) Integer pages,
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal salePrice,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal studentDiscountPct,
        @DecimalMin(value = "0.00", inclusive = true)
        @DecimalMax(value = "100.00") BigDecimal royaltyPoolPct,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal costPerUnit,
        @Min(0) Integer stockQuantity,
        @Size(max = 50) String branch,
        @Valid List<BookAuthorRequest> authors
) {}
