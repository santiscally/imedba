package com.imedba.modules.useradmin.dto;

/**
 * Edición de un usuario existente. Campos null = sin cambio. {@code role} reemplaza el
 * rol de realm de la app (se quitan los otros roles de app y se asigna éste).
 */
public record UpdateUserRequest(
        String firstName,
        String lastName,
        Boolean enabled,
        String role
) {}
