package com.imedba.modules.discount_campaign.dto;

import com.imedba.modules.discount_campaign.entity.DiscountType;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record DiscountCampaignResponse(
        UUID id,
        String name,
        String description,
        DiscountType discountType,
        BigDecimal discountValue,
        LocalDate startDate,
        LocalDate endDate,
        Boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
