package com.imedba.modules.course.dto;

import com.imedba.modules.course.entity.BusinessUnit;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CourseUpdateRequest(
        @NotBlank @Size(max = 200) String name,
        @Size(max = 50)  String code,
        String description,
        @NotNull BusinessUnit businessUnit,
        @Size(max = 50)  String modality,
        @PositiveOrZero  BigDecimal enrollmentPrice,
        @PositiveOrZero  BigDecimal coursePrice,
        LocalDate examDate,
        @Size(max = 500) String contractTemplatePath,
        Integer moodleCourseId,
        Boolean active
) {}
