package com.imedba.modules.useradmin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Alta de usuario en Keycloak. El {@code email} se usa también como {@code username}.
 * {@code role} es uno de los roles de realm de la app (ADMIN, VENDEDORA, …).
 * Si {@code temporaryPassword} es true, Keycloak obliga a cambiarla en el primer login.
 */
public record CreateUserRequest(
        @NotBlank @Email String email,
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotBlank @Size(min = 6, message = "La contraseña debe tener al menos 6 caracteres") String password,
        @NotBlank String role,
        boolean temporaryPassword
) {}
