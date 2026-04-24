package com.imedba.modules.budget.dto;

import java.math.BigDecimal;

/**
 * Serie mensual para gráfico de ingresos vs egresos (12 meses del año).
 */
public record MonthlyFlowResponse(
        int year,
        int month,
        BigDecimal income,
        BigDecimal expense,
        BigDecimal balance
) {}
