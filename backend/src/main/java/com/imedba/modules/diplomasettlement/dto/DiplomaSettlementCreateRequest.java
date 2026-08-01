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
 * <p>Todos los costos y porcentajes se cargan acá, no en la diplomatura (decisión
 * 2026-05-22 §2.6: «publicidad no es un porcentaje de nada, es lo que se gastó ese
 * mes»). Los cuatro gastos administrativos son <b>montos fijos</b>, no porcentajes.
 *
 * <p>{@code totalCollected}: si llega NULL, el service lo calcula solo sumando los
 * pagos del período de las inscripciones del curso vinculado (V026).
 */
public record DiplomaSettlementCreateRequest(
        @NotNull UUID diplomaId,
        @NotNull @Min(1) @Max(12) Integer periodMonth,
        @NotNull @Min(2020) @Max(2100) Integer periodYear,
        @DecimalMin(value = "0.00") BigDecimal totalCollected,

        /** Impuestos y gastos bancarios, en % — es el PRIMER descuento. */
        @DecimalMin(value = "0.00") @DecimalMax(value = "100.00") BigDecimal taxPct,

        // Los 4 gastos administrativos: MONTOS FIJOS.
        @DecimalMin(value = "0.00") BigDecimal secretaryAmount,
        @DecimalMin(value = "0.00") BigDecimal advertisingAmount,
        @DecimalMin(value = "0.00") BigDecimal administrationAmount,
        @DecimalMin(value = "0.00") BigDecimal miscExpensesAmount,

        /** Grabaciones docentes: se descuenta SÓLO de la mitad de las directoras. */
        @DecimalMin(value = "0.00") BigDecimal recordingsAmount,

        /** % de la mitad no-directoras que queda en IMEDBA. Default 80. */
        @DecimalMin(value = "0.00") @DecimalMax(value = "100.00") BigDecimal imedbaPct,
        /** % de la mitad no-directoras que se acumula para UNTREF. Default 20. */
        @DecimalMin(value = "0.00") @DecimalMax(value = "100.00") BigDecimal untrefPct
) {}
