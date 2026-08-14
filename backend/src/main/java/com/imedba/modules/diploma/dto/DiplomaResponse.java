package com.imedba.modules.diploma.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DiplomaResponse(
        UUID id,
        String name,
        String universityName,
        UUID courseId,
        String courseName,
        String description,
        BigDecimal enrollmentPrice,
        BigDecimal coursePrice,
        /** Directoras (Personal Académico). Sin porcentaje: reparten en partes iguales. */
        List<DirectorRefDto> directors,
        Boolean active,
        Instant createdAt,
        Instant updatedAt
) {

    /** Referencia mínima a una directora, para no arrastrar todo el StaffResponse. */
    public record DirectorRefDto(UUID id, String name, String email) {}
}
