package com.imedba.modules.staff.dto;

import com.imedba.modules.staff.entity.StaffSegment;
import com.imedba.modules.staff.entity.StaffType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record StaffResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        String phone,
        StaffType staffType,

        // Personal Académico (V034)
        String dni,
        String subject,
        StaffSegment segment,
        Boolean paidByHours,
        Boolean tutor,
        BigDecimal hourlyRate,

        Boolean active,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {}
