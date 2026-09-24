package com.imedba.modules.student.dto;

import com.imedba.modules.course.entity.BusinessUnit;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StudentUpdateRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Email @Size(max = 255) String email,
        /** RESIDENCIAS o FORMACION_SUPERIOR; null = Residencias en el alta, sin cambio en la edición. */
        BusinessUnit businessUnit,
        @Size(max = 50)  String phone,
        @Size(max = 20)  String dni,
        @Size(max = 100) String nationality,
        @Size(max = 200) String university,
        @Size(max = 200) String locality,
        @Size(max = 200) String residenceLocation,
        @Size(max = 300) String specialty,
        @Size(max = 300) String targetCompetition,
        Boolean iarPfoCompleted,
        Boolean active,
        String notes
) {}
