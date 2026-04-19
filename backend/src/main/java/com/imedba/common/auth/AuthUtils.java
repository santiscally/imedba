package com.imedba.common.auth;

import java.util.Optional;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Helpers para leer la identidad y los permisos del usuario autenticado.
 * Usan el {@link SecurityContextHolder} de Spring Security.
 */
public final class AuthUtils {

    private AuthUtils() {}

    /** UUID del {@code sub} del JWT, o vacío si no hay auth o no es parseable. */
    public static Optional<UUID> currentUserId() {
        return currentJwt()
                .map(Jwt::getSubject)
                .flatMap(sub -> {
                    try {
                        return Optional.of(UUID.fromString(sub));
                    } catch (IllegalArgumentException ex) {
                        return Optional.empty();
                    }
                });
    }

    public static Optional<Jwt> currentJwt() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
            return Optional.empty();
        }
        return Optional.of(jwt);
    }

    /** True si el usuario tiene el realm role (mapeado como {@code ROLE_<name>}). */
    public static boolean hasRole(String role) {
        return hasAuthority("ROLE_" + role);
    }

    /** True si el usuario tiene el permiso granular (client role del imedba-backend). */
    public static boolean hasAuthority(String authority) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return false;
        }
        for (GrantedAuthority ga : auth.getAuthorities()) {
            if (authority.equals(ga.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    /** True si el usuario es VENDEDORA y NO tiene ADMIN — usado para restringir queries. */
    public static boolean isVendedoraOnly() {
        return hasRole("VENDEDORA") && !hasRole("ADMIN");
    }
}
