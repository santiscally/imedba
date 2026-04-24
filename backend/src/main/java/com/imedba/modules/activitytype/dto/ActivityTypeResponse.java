package com.imedba.modules.activitytype.dto;

import com.imedba.modules.activitytype.entity.AppliesTo;
import java.math.BigDecimal;
import java.util.UUID;

public record ActivityTypeResponse(
        UUID id,
        String name,
        BigDecimal ratePerHour,
        AppliesTo appliesTo,
        Boolean active
) {}
