package com.imedba.config;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.core.convert.converter.Converter;

/**
 * OAuth2 Resource Server contra Keycloak. Mapea dos fuentes de authorities:
 * <ul>
 *   <li>{@code realm_access.roles} → prefijo {@code ROLE_} (hasRole('ADMIN')).</li>
 *   <li>{@code resource_access.imedba-backend.roles} → sin prefijo
 *       (hasAuthority('students:read')).</li>
 * </ul>
 * Stateless, CORS delegado al {@code CorsFilter} registrado en {@link CorsConfig}.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final String BACKEND_CLIENT_ID = "imedba-backend";

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/actuator/health/**",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/error"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakJwtAuthenticationConverter()))
                );

        return http.build();
    }

    @Bean
    public Converter<Jwt, AbstractAuthenticationToken> keycloakJwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Collection<GrantedAuthority> authorities = new ArrayList<>();

            // Scopes estándar (si los hubiera) mantenidos.
            authorities.addAll(new JwtGrantedAuthoritiesConverter().convert(jwt));

            // Realm roles → ROLE_<nombre>
            Object realmAccess = jwt.getClaim("realm_access");
            if (realmAccess instanceof Map<?, ?> realmMap) {
                Object roles = realmMap.get("roles");
                if (roles instanceof List<?> roleList) {
                    for (Object role : roleList) {
                        if (role != null) {
                            authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
                        }
                    }
                }
            }

            // Client roles del imedba-backend → authority plano (e.g. students:read)
            Object resourceAccess = jwt.getClaim("resource_access");
            if (resourceAccess instanceof Map<?, ?> resourceMap) {
                Object clientAccess = resourceMap.get(BACKEND_CLIENT_ID);
                if (clientAccess instanceof Map<?, ?> clientMap) {
                    Object roles = clientMap.get("roles");
                    if (roles instanceof List<?> roleList) {
                        for (Object role : roleList) {
                            if (role != null) {
                                authorities.add(new SimpleGrantedAuthority(role.toString()));
                            }
                        }
                    }
                }
            }

            return authorities;
        });
        // Usamos el subject (UUID del usuario Keycloak) como principal name.
        converter.setPrincipalClaimName("sub");
        return converter;
    }
}
