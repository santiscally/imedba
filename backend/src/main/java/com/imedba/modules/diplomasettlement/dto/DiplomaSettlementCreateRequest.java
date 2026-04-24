package com.imedba.modules.diplomasettlement.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record DiplomaSettlementCreateRequest(
        @NotNull UUID diplomaId,
        @NotNull @Min(1) @Max(12) Integer periodMonth,
        @NotNull @Min(2020) @Max(2100) Integer periodYear,
        @NotNull @DecimalMin(value = "0.00") BigDecimal totalCollected
) {}
