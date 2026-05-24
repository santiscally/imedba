package com.imedba.modules.diplomasettlement.dto;

import com.imedba.modules.diplomasettlement.entity.SettlementStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DiplomaSettlementResponse(
        UUID id,
        UUID diplomaId,
        String diplomaName,
        Integer periodMonth,
        Integer periodYear,
        BigDecimal totalCollected,
        // Inputs persistidos (V018): permiten recompute estable y mostrar en UI
        BigDecimal inputTaxCommissionPct,
        BigDecimal inputSecretarySalary,
        BigDecimal inputAdvertisingAmount,
        BigDecimal inputAdminPct,
        BigDecimal inputUniversityPct,
        BigDecimal inputImedbaPct,
        // Outputs calculados
        BigDecimal taxCommissionAmount,
        BigDecimal secretaryAmount,
        BigDecimal advertisingAmount,
        BigDecimal adminAmount,
        BigDecimal universityAmount,
        BigDecimal imedbaAmount,
        BigDecimal partnersTotal,
        List<PartnerDistributionDto> partnersDistribution,
        SettlementStatus status,
        Instant createdAt,
        Instant updatedAt
) {}
