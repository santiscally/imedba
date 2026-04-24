package com.imedba.modules.budget.dto;

import com.imedba.common.enums.PaymentMethod;
import com.imedba.modules.budget.entity.BudgetCategory;
import com.imedba.modules.budget.entity.BusinessUnit;
import com.imedba.modules.budget.entity.EntryType;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record BudgetEntryResponse(
        UUID id,
        EntryType entryType,
        BudgetCategory category,
        String subcategory,
        BusinessUnit businessUnit,
        String concept,
        BigDecimal amount,
        LocalDate entryDate,
        Integer periodMonth,
        Integer periodYear,
        PaymentMethod paymentMethod,
        Boolean recurring,
        Boolean cash,
        Boolean projected,
        String referenceNumber,
        String receiptFilePath,
        UUID contactId,
        UUID enrollmentId,
        UUID paymentId,
        UUID bookSaleId,
        String notes,
        UUID registeredBy,
        Instant createdAt,
        Instant updatedAt
) {}
