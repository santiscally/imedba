package com.imedba.modules.diploma.dto;

import com.imedba.modules.course.entity.Modality;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** {@code id} es el del curso: es lo que se elige al inscribir un alumno. */
public record CommissionResponse(
        UUID id,
        String name,
        Integer commission,
        Integer academicYear,
        BigDecimal enrollmentPrice,
        BigDecimal coursePrice,
        Boolean includesPremaBook,
        LocalDate startDate,
        LocalDate endDate,
        Modality modality,
        Integer moodleCourseId,
        Boolean active
) {}
