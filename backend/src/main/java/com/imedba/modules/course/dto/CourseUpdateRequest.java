package com.imedba.modules.course.dto;

import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.course.entity.CourseType;
import com.imedba.modules.course.entity.Modality;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CourseUpdateRequest(
        @NotBlank @Size(max = 200) String name,
        @Size(max = 50)  String code,
        String description,
        @NotNull BusinessUnit businessUnit,
        CourseType courseType,
        Modality modality,
        @Pattern(regexp = "^[A-Z]{2}$", message = "country debe ser ISO 3166-1 alpha-2") String country,
        @PositiveOrZero  BigDecimal enrollmentPrice,
        @PositiveOrZero  BigDecimal coursePrice,
        LocalDate examDate,
        Integer academicYear,
        @Positive Integer commission,
        @Size(max = 500) String contractTemplatePath,
        Integer moodleCourseId,
        Boolean active
) {}
