package com.imedba.modules.author.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record AuthorUpdateRequest(
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        @Email @Size(max = 255) String email,
        @Size(max = 50) String phone,
        Boolean active
) {}
