package com.imedba.modules.diploma.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DiplomaResponse(
        UUID id,
        String name,
        String universityName,
        String description,
        /** Directoras (Personal Académico). Sin porcentaje: reparten en partes iguales. */
        List<DirectorRefDto> directors,
        /** Comisiones, de la más nueva a la más vieja. */
        List<CommissionResponse> commissions,
        Boolean active,
        Instant createdAt,
        Instant updatedAt
) {

    /** Referencia mínima a una directora, para no arrastrar todo el StaffResponse. */
    public record DirectorRefDto(UUID id, String name, String email) {}
}
