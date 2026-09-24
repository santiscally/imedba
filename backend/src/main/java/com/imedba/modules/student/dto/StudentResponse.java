package com.imedba.modules.student.dto;

import com.imedba.modules.course.entity.BusinessUnit;
import java.time.Instant;
import java.util.UUID;

public record StudentResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        BusinessUnit businessUnit,
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
