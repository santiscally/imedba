package com.imedba.modules.budget.repository;

import com.imedba.modules.budget.entity.BudgetCategory;
import com.imedba.modules.budget.entity.BusinessUnit;
import java.math.BigDecimal;

public record BudgetAggregate(
        BudgetCategory category,
        BusinessUnit businessUnit,
        BigDecimal total
) {}
