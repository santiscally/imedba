package com.imedba.modules.useradmin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Blanqueo de contraseña. {@code temporary}=true → Keycloak la pide cambiar al loguear. */
public record ResetPasswordRequest(
        @NotBlank @Size(min = 6, message = "La contraseña debe tener al menos 6 caracteres") String password,
        boolean temporary
) {}
