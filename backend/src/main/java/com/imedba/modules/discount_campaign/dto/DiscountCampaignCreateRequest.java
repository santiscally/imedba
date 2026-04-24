package com.imedba.modules.discount_campaign.dto;

import com.imedba.modules.discount_campaign.entity.DiscountType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record DiscountCampaignCreateRequest(
        @NotBlank @Size(max = 200) String name,
        String description,
        @NotNull DiscountType discountType,
        @NotNull @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal discountValue,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        Boolean active
) {}
