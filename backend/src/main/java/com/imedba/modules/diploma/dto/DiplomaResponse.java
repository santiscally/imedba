package com.imedba.modules.diploma.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DiplomaResponse(
        UUID id,
        String name,
        String universityName,
        String description,
        BigDecimal enrollmentPrice,
        BigDecimal coursePrice,
        BigDecimal taxCommissionPct,
        BigDecimal secretarySalary,
        BigDecimal advertisingAmount,
        BigDecimal adminPct,
        BigDecimal universityPct,
        BigDecimal imedbaPct,
        List<PartnerConfigDto> partnersConfig,
        Boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
