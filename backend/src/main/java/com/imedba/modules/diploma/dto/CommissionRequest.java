package com.imedba.modules.diploma.dto;

import com.imedba.modules.course.entity.Modality;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Una comisión de la diplomatura: por debajo es un curso FS al que se inscriben los alumnos. */
public record CommissionRequest(
        @NotNull @Positive Integer commission,
        Integer academicYear,
        @PositiveOrZero BigDecimal enrollmentPrice,
        @PositiveOrZero BigDecimal coursePrice,
        Boolean includesPremaBook,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        Modality modality,
        Integer moodleCourseId,
        Boolean active
) {}
