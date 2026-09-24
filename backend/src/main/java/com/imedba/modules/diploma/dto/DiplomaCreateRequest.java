package com.imedba.modules.diploma.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/** Diplomatura general; los precios, el libro y las fechas van en cada comisión (docx 2026-09-24). */
public record DiplomaCreateRequest(
        @NotBlank @Size(max = 300) String name,
        @Size(max = 200) String universityName,
        String description,
        /** Ids de Personal Académico (staff) con rol DIRECTORA. Reparten en partes iguales. */
        List<UUID> directorIds,
        /** Opcional: crea la primera comisión en el mismo alta. */
        @Valid CommissionRequest firstCommission
) {}
