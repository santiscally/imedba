package com.imedba.modules.budget.repository;

import com.imedba.modules.budget.entity.EntryType;
import java.math.BigDecimal;

public record PeriodTotals(
        Integer year,
        Integer month,
        EntryType entryType,
        BigDecimal total
) {}
