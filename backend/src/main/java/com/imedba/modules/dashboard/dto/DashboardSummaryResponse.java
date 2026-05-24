package com.imedba.modules.dashboard.dto;

import java.math.BigDecimal;

/**
 * KPIs principales del dashboard. Contrato espejado del mock del SPA
 * (frontend/src/api/mock/handlers.ts:919 — pedido reunión 2026-05-22 §2.9).
 */
public record DashboardSummaryResponse(
        long alumnosActivos,
        long cursosActivos,
        long cuotasVencidas,
        BigDecimal ingresosMes
) {}
