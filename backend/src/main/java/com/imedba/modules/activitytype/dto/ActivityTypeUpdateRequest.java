package com.imedba.modules.activitytype.dto;

import com.imedba.modules.activitytype.entity.AppliesTo;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ActivityTypeUpdateRequest(
        @Size(max = 100) String name,
        @DecimalMin(value = "0.00") @Digits(integer = 10, fraction = 2) BigDecimal ratePerHour,
        AppliesTo appliesTo,
        Boolean active
) {}
