package com.imedba.modules.contact.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record ContactUpdateRequest(
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        @Size(max = 200) String companyName,
        @Email @Size(max = 255) String email,
        @Size(max = 50) String phone,
        @Size(max = 200) String roleDescription,
        UUID keycloakUserId,
        Boolean active,
        String notes
) {}
