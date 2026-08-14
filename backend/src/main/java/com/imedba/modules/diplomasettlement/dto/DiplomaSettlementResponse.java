package com.imedba.modules.diplomasettlement.dto;

import com.imedba.modules.diplomasettlement.entity.SettlementStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Liquidación de diplomatura. Los campos van en el <b>orden de la fórmula</b>
 * (doc 17 §3.3) para que la UI pueda mostrarla como la planilla de IMEDBA:
 * cobrado → impuestos → subtotal 1 → 4 gastos fijos → subtotal 2 → mitad →
 * (directoras − grabaciones) y (IMEDBA 80 / UNTREF 20).
 */
public record DiplomaSettlementResponse(
        UUID id,
        UUID diplomaId,
        String diplomaName,
        Integer periodMonth,
        Integer periodYear,

        // Inputs persistidos: permiten recompute estable y mostrarlos en la UI
        BigDecimal inputTaxCommissionPct,
        BigDecimal inputSecretarySalary,
        BigDecimal inputAdvertisingAmount,
        BigDecimal inputAdministrationAmount,
        BigDecimal inputMiscExpensesAmount,
        BigDecimal inputRecordingsAmount,
        BigDecimal inputImedbaPct,
        BigDecimal inputUntrefPct,

        // Cálculo, paso por paso
        BigDecimal totalCollected,
        BigDecimal taxCommissionAmount,
        BigDecimal subtotal1,
        BigDecimal secretaryAmount,
        BigDecimal advertisingAmount,
        BigDecimal administrationAmount,
        BigDecimal miscExpensesAmount,
        BigDecimal subtotal2,
        BigDecimal halfAmount,
        BigDecimal recordingsAmount,
        BigDecimal directorsBaseAmount,
        List<DirectorDistributionDto> directorsDistribution,
        BigDecimal imedbaAmount,
        BigDecimal untrefAmount,

        SettlementStatus status,
        Instant createdAt,
        Instant updatedAt
) {}
