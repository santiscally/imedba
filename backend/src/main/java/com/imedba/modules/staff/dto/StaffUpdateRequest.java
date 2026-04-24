package com.imedba.modules.staff.dto;

import com.imedba.modules.staff.entity.StaffType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record StaffUpdateRequest(
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        @Email @Size(max = 255) String email,
        @Size(max = 50) String phone,
        StaffType staffType,
        Boolean active,
        String notes
) {}
