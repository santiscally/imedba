package com.imedba.modules.budget.dto;

import com.imedba.common.enums.PaymentMethod;
import com.imedba.modules.budget.entity.BudgetCategory;
import com.imedba.modules.budget.entity.BusinessUnit;
import com.imedba.modules.budget.entity.EntryType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record BudgetEntryCreateRequest(
        @NotNull EntryType entryType,
        @NotNull BudgetCategory category,
        @Size(max = 100) String subcategory,
        BusinessUnit businessUnit,
        @NotBlank @Size(max = 300) String concept,
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal amount,
        @NotNull LocalDate entryDate,
        PaymentMethod paymentMethod,
        Boolean recurring,
        Boolean cash,
        Boolean projected,
        @Size(max = 200) String referenceNumber,
        @Size(max = 500) String receiptFilePath,
        UUID contactId,
        UUID enrollmentId,
        String notes
) {}
