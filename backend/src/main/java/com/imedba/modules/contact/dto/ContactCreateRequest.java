package com.imedba.modules.contact.dto;

import com.imedba.modules.contact.entity.ContactType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record ContactCreateRequest(
        @NotNull ContactType contactType,
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        @Size(max = 200) String companyName,
        @Email @Size(max = 255) String email,
        @Size(max = 50) String phone,
        @Size(max = 200) String roleDescription,
        UUID keycloakUserId,
        String notes
) {}
