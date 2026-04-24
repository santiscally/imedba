package com.imedba.modules.contact.dto;

import com.imedba.modules.contact.entity.ContactType;
import java.time.Instant;
import java.util.UUID;

public record ContactResponse(
        UUID id,
        ContactType contactType,
        String firstName,
        String lastName,
        String companyName,
        String email,
        String phone,
        String roleDescription,
        UUID keycloakUserId,
        Boolean active,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {}
