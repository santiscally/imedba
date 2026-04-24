package com.imedba.modules.diploma.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record DiplomaUpdateRequest(
        @Size(max = 300) String name,
        @Size(max = 200) String universityName,
        String description,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal enrollmentPrice,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal coursePrice,
        @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal taxCommissionPct,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal secretarySalary,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal advertisingAmount,
        @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal adminPct,
        @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal universityPct,
        @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal imedbaPct,
        @Valid List<PartnerConfigDto> partnersConfig,
        Boolean active
) {}
