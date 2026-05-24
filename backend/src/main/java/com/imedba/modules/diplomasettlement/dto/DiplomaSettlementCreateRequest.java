package com.imedba.modules.diplomasettlement.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Payload para crear una liquidación.
 *
 * <p>Reunión 2026-05-22 §2.6: los inputs (porcentajes y montos) se cargan por
 * liquidación, no por diploma. Cualquier campo de input que llegue NULL hace
 * fallback al valor del Diploma.
 *
 * <p>{@code totalCollected}: hoy se recibe como input. Si llega NULL, el
 * service lo calculará automáticamente a partir de los pagos del período
 * vinculados a la diplomatura (próxima iteración — issue P1.2).
 */
public record DiplomaSettlementCreateRequest(
        @NotNull UUID diplomaId,
        @NotNull @Min(1) @Max(12) Integer periodMonth,
        @NotNull @Min(2020) @Max(2100) Integer periodYear,
        @DecimalMin(value = "0.00") BigDecimal totalCollected,

        // Inputs por liquidación (todos opcionales — null = fallback al Diploma).
        @DecimalMin(value = "0.00") @DecimalMax(value = "100.00") BigDecimal taxCommissionPct,
        @DecimalMin(value = "0.00") BigDecimal secretarySalary,
        @DecimalMin(value = "0.00") BigDecimal advertisingAmount,
        @DecimalMin(value = "0.00") @DecimalMax(value = "100.00") BigDecimal adminPct,
        @DecimalMin(value = "0.00") @DecimalMax(value = "100.00") BigDecimal universityPct,
        @DecimalMin(value = "0.00") @DecimalMax(value = "100.00") BigDecimal imedbaPct
) {}
