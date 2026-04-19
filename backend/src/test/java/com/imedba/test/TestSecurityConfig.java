package com.imedba.test;

import static org.mockito.Mockito.mock;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.oauth2.jwt.JwtDecoder;

/**
 * Config de test: provee un {@link JwtDecoder} mockeado para que el resource-server
 * arranque sin un Keycloak real. Los tests autenticados usan {@code jwt()} de
 * spring-security-test, que fija el SecurityContext directamente sin decodificar tokens.
 *
 * <p>El {@code AuditorAware} de producción ({@code JwtAuditorAware}) funciona tal cual
 * en tests: durante un request MockMvc autenticado con {@code jwt()} hay
 * Authentication en el SecurityContext, así que {@code createdBy} se popula OK.</p>
 */
@TestConfiguration
public class TestSecurityConfig {

    @Bean
    @Primary
    public JwtDecoder jwtDecoder() {
        return mock(JwtDecoder.class);
    }
}
