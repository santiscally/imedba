package com.imedba.modules.diploma.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

/**
 * La diplomatura ES un curso (decisión 2026-06-09): al crearla, el backend genera
 * automáticamente su curso espejo en FORMACION_SUPERIOR (nombre/precios sincronizados).
 * Los alumnos se inscriben a ese curso con el flujo normal — no hay vínculo manual.
 */
public record DiplomaCreateRequest(
        @NotBlank @Size(max = 300) String name,
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
        @Valid List<PartnerConfigDto> partnersConfig
) {}
