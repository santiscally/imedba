package com.imedba.modules.student.dto;

import java.time.Instant;
import java.util.UUID;

public record StudentResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        String phone,
        String dni,
        String nationality,
        String university,
        String locality,
        String residenceLocation,
        String specialty,
        String targetCompetition,
        Boolean iarPfoCompleted,
        Boolean active,
        Integer moodleUserId,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {}
