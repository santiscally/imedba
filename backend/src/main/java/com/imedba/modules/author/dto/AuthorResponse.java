package com.imedba.modules.author.dto;

import java.time.Instant;
import java.util.UUID;

public record AuthorResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        String phone,
        Boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
