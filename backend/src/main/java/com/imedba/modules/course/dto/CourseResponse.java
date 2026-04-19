package com.imedba.modules.course.dto;

import com.imedba.modules.course.entity.BusinessUnit;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CourseResponse(
        UUID id,
        String name,
        String code,
        String description,
        BusinessUnit businessUnit,
        String modality,
        BigDecimal enrollmentPrice,
        BigDecimal coursePrice,
        LocalDate examDate,
        String contractTemplatePath,
        Integer moodleCourseId,
        Boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
