package com.imedba.modules.diploma.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record DiplomaUpdateRequest(
        @Size(max = 300) String name,
        @Size(max = 200) String universityName,
        String description,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal enrollmentPrice,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal coursePrice,
        /** Si viene no-null, reemplaza el set completo de directoras. null = no tocar. */
        List<UUID> directorIds,
        Boolean active
) {}
