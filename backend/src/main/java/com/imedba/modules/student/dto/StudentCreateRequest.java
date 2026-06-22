package com.imedba.modules.student.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record StudentCreateRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Email @Size(max = 255) String email,
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
        String notes,
        // Opcional: lo setea el front cuando el botón "Validar con Moodle" del alta
        // encuentra una cuenta de Moodle con este email. Si es null, el alumno queda
        // sin vincular y se puede vincular después (StudentDetail / link-all).
        @Positive Integer moodleUserId
) {}
