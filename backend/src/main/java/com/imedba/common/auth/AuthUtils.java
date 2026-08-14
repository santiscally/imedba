package com.imedba.common.auth;

import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Helpers para leer la identidad y los permisos del usuario autenticado.
 * Usan el {@link SecurityContextHolder} de Spring Security.
 */
public final class AuthUtils {

    private static final Logger log = LoggerFactory.getLogger(AuthUtils.class);

    private AuthUtils() {}

    /**
     * UUID del usuario autenticado. <b>Falla si el token no lo trae</b>, en vez de
     * devolver vacío para que el llamador escriba NULL.
     *
     * <p><b>Por qué existe (incidente 2026-08-10).</b> Desde Keycloak 24 el claim
     * {@code sub} lo emite el client scope {@code basic}; nuestro realm JSON declaraba su
     * propia lista de {@code clientScopes}, que reemplaza las built-in, así que {@code basic}
     * nunca se creaba y los access token salían sin {@code sub} (arreglado en {@code 1ec4049}).
     * Todos los llamadores hacían {@code currentUserId().orElse(null)}, así que durante tres
     * semanas se guardó NULL en silencio en {@code enrollments.enrolled_by},
     * {@code book_sales.sold_by} y {@code budget_entries.registered_by}. Consecuencias: la
     * liquidación de comisiones no encontraba vendedoras, y —peor— el filtro «la vendedora ve
     * sólo lo suyo» dejaba de filtrar (un {@code enrolledBy} null en el Specification no
     * agrega restricción, o sea: veía todo).
     *
     * <p>Usar este método en <b>toda escritura de autoría y todo filtro de scope</b>. El
     * {@link #currentUserId()} con Optional queda para los casos donde la ausencia de usuario
     * es legítima.
     *
     * @throws AuthenticationCredentialsNotFoundException si no hay JWT o no trae {@code sub}
     *     parseable — se mapea a 401 en {@code GlobalExceptionHandler}.
     */
    public static UUID requireCurrentUserId() {
        Optional<UUID> id = currentUserId();
        if (id.isEmpty()) {
            log.error("JWT sin `sub` utilizable — no se puede atribuir la operación. subject={}",
                    currentJwt().map(Jwt::getSubject).orElse("<sin JWT en el contexto>"));
            throw new AuthenticationCredentialsNotFoundException(
                    "El token no identifica al usuario (claim `sub` ausente o inválido). "
                            + "Cerrá sesión y volvé a entrar.");
        }
        return id.get();
    }

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
