package com.imedba.modules.dashboard.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Fila del panel de cuotas vencidas en el Dashboard.
 * Contrato espejado del mock del SPA (handlers.ts:931).
 * Filtros del backend: status=OVERDUE y diasVencidos > 10.
 */
public record OverdueInstallmentResponse(
        UUID id,
        String alumno,
        String curso,
        Integer cuotaNumero,
        long cuotaTotal,
        long diasVencidos,
        BigDecimal monto
) {}
