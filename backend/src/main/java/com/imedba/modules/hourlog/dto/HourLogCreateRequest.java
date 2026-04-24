package com.imedba.modules.hourlog.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Si {@code activityTypeId} viene, la tarifa se lee del catálogo (rate_per_hour
 * actual) y se copia al registro. Si viene {@code ratePerHour}, ese valor pisa
 * el del catálogo (override manual). {@code activityType} es el texto libre
 * guardado (tomado del name del catálogo si se usa el id).
 */
public record HourLogCreateRequest(
        @NotNull UUID staffId,
        UUID activityTypeId,
        @Size(max = 100) String activityType,
        @NotNull @Min(1) @Max(12) Integer periodMonth,
        @NotNull @Min(2020) @Max(2100) Integer periodYear,
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 4, fraction = 2) BigDecimal hours,
        @DecimalMin(value = "0.00") @Digits(integer = 10, fraction = 2) BigDecimal ratePerHour,
        String notes
) {}
