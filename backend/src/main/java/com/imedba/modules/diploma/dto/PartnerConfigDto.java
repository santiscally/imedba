package com.imedba.modules.diploma.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record PartnerConfigDto(
        @NotBlank String name,
        @DecimalMin(value = "0.00") @DecimalMax(value = "100.00") BigDecimal pct,
        @Email String email
) {}
