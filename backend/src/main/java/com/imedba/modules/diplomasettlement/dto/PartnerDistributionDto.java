package com.imedba.modules.diplomasettlement.dto;

import java.math.BigDecimal;

public record PartnerDistributionDto(
        String name,
        BigDecimal pct,
        BigDecimal amount,
        String email,
        Boolean paid
) {}
