package com.imedba.modules.student.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StudentUpdateRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Email @Size(max = 255) String email,
        @Size(max = 50)  String phone,
        @Size(max = 20)  String dni,
        @Size(max = 100) String nationality,
        @Size(max = 200) String university,
        @Size(max = 200) String locality,
        Boolean active,
        String notes
) {}
