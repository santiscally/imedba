package com.imedba.modules.staff.dto;

import com.imedba.modules.staff.entity.StaffType;
import java.time.Instant;
import java.util.UUID;

public record StaffResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        String phone,
        StaffType staffType,
        Boolean active,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {}
