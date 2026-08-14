package com.imedba.modules.course.dto;

import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.course.entity.CourseType;
import com.imedba.modules.course.entity.Modality;
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
        CourseType courseType,
        Modality modality,
        String country,
        BigDecimal enrollmentPrice,
        BigDecimal coursePrice,
        LocalDate examDate,
        Integer academicYear,
        Integer commission,
        String contractTemplatePath,
        Integer moodleCourseId,
        Boolean includesPremaBook,
        Boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
