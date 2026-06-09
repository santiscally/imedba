package com.imedba.modules.collection.dto;

import com.imedba.modules.collection.entity.CollectionVariant;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CollectionCreateRequest(
        @NotBlank @Size(max = 200) String name,
        @NotNull CollectionVariant variant,
        @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal price,
        @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal studentDiscountPct,
        Boolean active,
        List<UUID> bookIds
) {}
