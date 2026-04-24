package com.imedba.modules.budget.dto;

import java.math.BigDecimal;

/**
 * Resumen de un período (año/mes): ingresos reales, egresos reales, balance
 * (income - expense), y valores proyectados si se cargaron.
 */
public record BudgetSummaryResponse(
        int year,
        int month,
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal balance,
        BigDecimal projectedIncome,
        BigDecimal projectedExpense
) {}
