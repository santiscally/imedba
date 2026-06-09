package com.imedba.modules.useradmin.dto;

import java.util.List;

/**
 * Usuario de la app tal como lo expone Keycloak. {@code roles} son los roles de realm
 * de la app (ADMIN, VENDEDORA, …), ya filtrados de los roles internos de Keycloak.
 */
public record AppUserResponse(
        String id,
        String username,
        String email,
        String firstName,
        String lastName,
        boolean enabled,
        List<String> roles
) {}
