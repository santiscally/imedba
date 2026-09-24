package com.imedba.modules.diploma.dto;

import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record DiplomaUpdateRequest(
        @Size(max = 300) String name,
        @Size(max = 200) String universityName,
        String description,
        /** Si viene no-null, reemplaza el set completo de directoras. null = no tocar. */
        List<UUID> directorIds,
        Boolean active
) {}
