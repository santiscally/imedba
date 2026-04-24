package com.imedba.modules.budget.dto;

import com.imedba.modules.budget.entity.BudgetCategory;
import com.imedba.modules.budget.entity.BusinessUnit;
import com.imedba.modules.budget.entity.EntryType;
import java.math.BigDecimal;

public record CategoryBreakdownResponse(
        EntryType entryType,
        BudgetCategory category,
        BusinessUnit businessUnit,
        BigDecimal total
) {}
