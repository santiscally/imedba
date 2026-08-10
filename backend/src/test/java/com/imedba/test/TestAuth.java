package com.imedba.test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Fija un {@link SecurityContextHolder} con un JWT que trae {@code sub}, para tests
 * unitarios (Mockito puro) que llaman servicios de escritura.
 *
 * <p><b>Por qué hace falta.</b> Desde el guard de {@code AuthUtils.requireCurrentUserId()}
 * (incidente 2026-08-10) toda escritura de autoría exige un usuario resuelto: si no hay JWT
 * con {@code sub}, revienta en vez de guardar NULL en silencio. Los tests que ejercitan esas
 * escrituras tienen que declarar quién las hace, igual que en producción.
 *
 * <p>Los tests de integración (MockMvc) no necesitan esto: usan {@code jwt()} de
 * spring-security-test, que ya fija el contexto. Ver {@link TestSecurityConfig}.
 *
 * <p>Siempre llamar a {@link #clear()} en un {@code @AfterEach}: el SecurityContext es un
 * ThreadLocal y JUnit reutiliza el thread entre tests.
 */
public final class TestAuth {

    /** Usuario por defecto de los tests; sirve para assertions sobre la autoría. */
    public static final UUID DEFAULT_USER = UUID.fromString("00000000-0000-0000-0000-0000000000a1");

    private TestAuth() {}

    /** Autentica como {@link #DEFAULT_USER}. */
    public static UUID login() {
        return login(DEFAULT_USER);
    }

    /** Autentica como el usuario dado y devuelve su id, para encadenar en assertions. */
    public static UUID login(UUID userId) {
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .subject(userId.toString())
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .claim("preferred_username", "test@imedba.dev")
                .build();
        SecurityContextHolder.getContext()
                .setAuthentication(new JwtAuthenticationToken(jwt, List.of()));
        return userId;
    }

    /** Limpia el contexto. Obligatorio en {@code @AfterEach}. */
    public static void clear() {
        SecurityContextHolder.clearContext();
    }
}
