package com.imedba.modules.useradmin.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Config del módulo Personal = gestión de usuarios de la app vía Keycloak Admin REST API.
 *
 * <p>Los usuarios de IMEDBA viven en Keycloak (realm {@code imedba}), no en la DB de la
 * app. Este módulo (solo ADMIN) los da de alta con contraseña + rol. En dev autenticamos
 * con el admin del realm {@code master} (cliente {@code admin-cli}, grant password) — anda
 * con el admin/admin del compose sin tocar service-account roles. En prod conviene un
 * service account dedicado con rol {@code manage-users} de {@code realm-management}.</p>
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "keycloak.admin")
public class KeycloakAdminProperties {

    /** Si false, los endpoints de Personal devuelven 409 explicativo (no rompen el resto). */
    private boolean enabled = true;

    /** Base URL de Keycloak vista desde el backend (red interna docker). Sin slash final. */
    private String baseUrl = "http://keycloak:8080";

    /** Realm objetivo donde viven los usuarios de la app. */
    private String realm = "imedba";

    /** Realm contra el que autenticamos al admin (normalmente {@code master}). */
    private String adminRealm = "master";

    /** Client público para el grant de admin (normalmente {@code admin-cli}). */
    private String clientId = "admin-cli";

    private String username = "admin";
    private String password = "admin";

    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 10000;
}
