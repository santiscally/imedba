package com.imedba.common.web;

import java.util.List;
import java.util.Map;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint de diagnóstico: devuelve quién soy según el JWT y qué authorities me cargó el
 * {@link com.imedba.config.SecurityConfig}. Útil para debuggear permisos Keycloak en dev.
 */
@RestController
@RequestMapping("/api/v1/me")
public class MeController {

    @GetMapping
    public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt,
                                  java.security.Principal principal) {
        List<String> authorities = AuthorityUtils.authorityListToSet(
                org.springframework.security.core.context.SecurityContextHolder.getContext()
                        .getAuthentication()
                        .getAuthorities().stream().map(GrantedAuthority.class::cast).toList()
        ).stream().sorted().toList();

        return Map.of(
                "sub", jwt.getSubject(),
                "preferredUsername", jwt.getClaimAsString("preferred_username"),
                "email", jwt.getClaimAsString("email"),
                "name", jwt.getClaimAsString("name"),
                "authorities", authorities
        );
    }
}
