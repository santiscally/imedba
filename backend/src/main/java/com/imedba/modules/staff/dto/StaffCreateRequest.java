package com.imedba.modules.staff.dto;

import com.imedba.modules.staff.entity.StaffType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StaffCreateRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @Email @Size(max = 255) String email,
        @Size(max = 50) String phone,
        @NotNull StaffType staffType,
        String notes
) {}
