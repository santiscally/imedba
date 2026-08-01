package com.imedba.modules.useradmin.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.imedba.modules.useradmin.config.KeycloakAdminProperties;
import com.imedba.modules.useradmin.dto.AppUserResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Cliente del Keycloak Admin REST API para el módulo Personal. Saca un token de admin
 * (grant password contra el realm {@code master}, cliente {@code admin-cli}) y opera sobre
 * los usuarios del realm de la app.
 *
 * <p>No cachea el token (los de admin viven poco): se pide uno por operación, simple y
 * suficiente para el volumen de usuarios de IMEDBA.</p>
 */
@Slf4j
@Component
public class KeycloakAdminClient {

    /** Roles de realm que son "de la app" (se filtran los internos de Keycloak). */
    public static final Set<String> APP_ROLES = Set.of(
            "ADMIN", "VENDEDORA", "SECRETARIA_FS", "SECRETARIA_RM", "EDITORIAL", "CONTABLE", "VIEWER");

    private final KeycloakAdminProperties props;
    private final RestClient http;

    public KeycloakAdminClient(KeycloakAdminProperties props) {
        this.props = props;
        SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
        rf.setConnectTimeout(Duration.ofMillis(props.getConnectTimeoutMs()));
        rf.setReadTimeout(Duration.ofMillis(props.getReadTimeoutMs()));
        this.http = RestClient.builder()
                .baseUrl(stripTrailingSlash(props.getBaseUrl()))
                .requestFactory(rf)
                .build();
    }

    public boolean isEnabled() {
        return props.isEnabled();
    }

    // ─── Token ───────────────────────────────────────────────────────────────
    private String adminToken() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "password");
        form.add("client_id", props.getClientId());
        form.add("username", props.getUsername());
        form.add("password", props.getPassword());
        try {
            JsonNode res = http.post()
                    .uri("/realms/{realm}/protocol/openid-connect/token", props.getAdminRealm())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(JsonNode.class);
            if (res == null || !res.hasNonNull("access_token")) {
                throw new KeycloakAdminException("Keycloak no devolvió access_token de admin");
            }
            return res.get("access_token").asText();
        } catch (KeycloakAdminException e) {
            throw e;
        } catch (Exception e) {
            throw new KeycloakAdminException(
                    "No se pudo autenticar contra Keycloak admin (" + props.getAdminRealm() + ")", e);
        }
    }

    // ─── Usuarios ──────────────────────────────────────────────────────────────
    public List<AppUserResponse> listUsers() {
        String token = adminToken();
        JsonNode arr = adminGet(token, "/admin/realms/{realm}/users?briefRepresentation=false&max=500", props.getRealm());
        List<AppUserResponse> out = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode u : arr) {
                String id = text(u, "id");
                out.add(new AppUserResponse(
                        id,
                        text(u, "username"),
                        text(u, "email"),
                        text(u, "firstName"),
                        text(u, "lastName"),
                        u.path("enabled").asBoolean(true),
                        appRolesOf(token, id)));
            }
        }
        return out;
    }

    /**
     * Mapa {@code id → nombre visible} de todos los usuarios del realm, en <b>una</b>
     * llamada.
     *
     * <p>Existe aparte de {@link #listUsers()} porque ese resuelve los roles de cada
     * usuario con una llamada extra por cabeza (N+1 contra Keycloak) y acá sólo hace
     * falta el nombre. Lo usa la liquidación de comisiones para mostrar «Vendedora
     * Fulana» en vez del UUID crudo, sin exigir {@code admin:manage}.
     *
     * <p>Degrada a mapa vacío si la integración admin está apagada o Keycloak no
     * responde: mostrar el UUID es peor que un nombre, pero mucho mejor que un 500.
     */
    public Map<String, String> displayNamesById() {
        if (!isEnabled()) {
            return Map.of();
        }
        try {
            JsonNode arr = adminGet(adminToken(),
                    "/admin/realms/{realm}/users?briefRepresentation=true&max=500",
                    props.getRealm());
            Map<String, String> out = new LinkedHashMap<>();
            if (arr != null && arr.isArray()) {
                for (JsonNode u : arr) {
                    String id = text(u, "id");
                    if (id != null && !id.isBlank()) {
                        out.put(id, displayName(u));
                    }
                }
            }
            return out;
        } catch (RuntimeException e) {
            log.warn("No se pudieron resolver los nombres de usuario contra Keycloak: {}",
                    e.getMessage());
            return Map.of();
        }
    }

    private static String displayName(JsonNode u) {
        String first = text(u, "firstName");
        String last = text(u, "lastName");
        String full = ((first == null ? "" : first) + " " + (last == null ? "" : last)).trim();
        if (!full.isEmpty()) return full;
        String username = text(u, "username");
        return username != null ? username : text(u, "email");
    }

    /** Crea el usuario (email = username), le setea password y le asigna el rol. Devuelve el id. */
    public String createUser(String email, String firstName, String lastName,
                             String password, String role, boolean temporary) {
        String token = adminToken();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("username", email);
        body.put("email", email);
        body.put("firstName", firstName);
        body.put("lastName", lastName);
        body.put("enabled", true);
        body.put("emailVerified", true);
        body.put("credentials", List.of(credential(password, temporary)));

        adminPost(token, "/admin/realms/{realm}/users", body, props.getRealm());
        String id = findUserIdByUsername(token, email);
        if (id == null) {
            throw new KeycloakAdminException("Usuario creado pero no se pudo localizar su id");
        }
        assignRealmRole(token, id, role);
        log.info("Usuario Keycloak creado: {} (rol {})", email, role);
        return id;
    }

    public void update(String id, String firstName, String lastName, Boolean enabled, String role) {
        String token = adminToken();
        Map<String, Object> body = new LinkedHashMap<>();
        if (firstName != null) body.put("firstName", firstName);
        if (lastName != null)  body.put("lastName", lastName);
        if (enabled != null)   body.put("enabled", enabled);
        if (!body.isEmpty()) {
            adminPut(token, "/admin/realms/{realm}/users/{id}", body, props.getRealm(), id);
        }
        if (role != null && !role.isBlank()) {
            replaceAppRole(token, id, role);
        }
    }

    public void resetPassword(String id, String password, boolean temporary) {
        String token = adminToken();
        adminPut(token, "/admin/realms/{realm}/users/{id}/reset-password",
                credential(password, temporary), props.getRealm(), id);
        log.info("Password reseteada para usuario {}", id);
    }

    public void delete(String id) {
        String token = adminToken();
        adminDelete(token, "/admin/realms/{realm}/users/{id}", props.getRealm(), id);
        log.info("Usuario Keycloak eliminado: {}", id);
    }

    public List<String> appRoles() {
        return APP_ROLES.stream().sorted().toList();
    }

    // ─── Roles ───────────────────────────────────────────────────────────────
    private List<String> appRolesOf(String token, String userId) {
        JsonNode arr = adminGet(token, "/admin/realms/{realm}/users/{id}/role-mappings/realm",
                props.getRealm(), userId);
        List<String> roles = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode r : arr) {
                String name = text(r, "name");
                if (name != null && APP_ROLES.contains(name)) {
                    roles.add(name);
                }
            }
        }
        return roles;
    }

    private void assignRealmRole(String token, String userId, String role) {
        if (!APP_ROLES.contains(role)) {
            throw new KeycloakAdminException("Rol desconocido: " + role);
        }
        JsonNode roleRep = adminGet(token, "/admin/realms/{realm}/roles/{role}", props.getRealm(), role);
        if (roleRep == null || !roleRep.hasNonNull("id")) {
            throw new KeycloakAdminException("No se encontró el rol de realm: " + role);
        }
        Map<String, Object> rep = new LinkedHashMap<>();
        rep.put("id", roleRep.get("id").asText());
        rep.put("name", roleRep.get("name").asText());
        adminPost(token, "/admin/realms/{realm}/users/{id}/role-mappings/realm",
                List.of(rep), props.getRealm(), userId);
    }

    /** Quita los roles de app actuales y asigna sólo {@code role}. */
    private void replaceAppRole(String token, String userId, String role) {
        JsonNode current = adminGet(token, "/admin/realms/{realm}/users/{id}/role-mappings/realm",
                props.getRealm(), userId);
        List<Map<String, Object>> toRemove = new ArrayList<>();
        if (current != null && current.isArray()) {
            for (JsonNode r : current) {
                String name = text(r, "name");
                if (name != null && APP_ROLES.contains(name) && !name.equals(role)) {
                    Map<String, Object> rep = new LinkedHashMap<>();
                    rep.put("id", text(r, "id"));
                    rep.put("name", name);
                    toRemove.add(rep);
                }
            }
        }
        if (!toRemove.isEmpty()) {
            adminDeleteBody(token, "/admin/realms/{realm}/users/{id}/role-mappings/realm",
                    toRemove, props.getRealm(), userId);
        }
        assignRealmRole(token, userId, role);
    }

    private String findUserIdByUsername(String token, String username) {
        JsonNode arr = adminGet(token,
                "/admin/realms/{realm}/users?exact=true&username={u}", props.getRealm(), username);
        if (arr != null && arr.isArray() && !arr.isEmpty()) {
            return text(arr.get(0), "id");
        }
        return null;
    }

    private static Map<String, Object> credential(String password, boolean temporary) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("type", "password");
        c.put("value", password);
        c.put("temporary", temporary);
        return c;
    }

    // ─── HTTP helpers (con bearer de admin) ──────────────────────────────────
    private JsonNode adminGet(String token, String uri, Object... vars) {
        try {
            return http.get().uri(uri, vars)
                    .header("Authorization", "Bearer " + token)
                    .retrieve().body(JsonNode.class);
        } catch (Exception e) {
            throw new KeycloakAdminException("GET " + uri + " falló: " + e.getMessage(), e);
        }
    }

    private void adminPost(String token, String uri, Object body, Object... vars) {
        try {
            http.post().uri(uri, vars)
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve().toBodilessEntity();
        } catch (Exception e) {
            throw new KeycloakAdminException("POST " + uri + " falló: " + e.getMessage(), e);
        }
    }

    private void adminPut(String token, String uri, Object body, Object... vars) {
        try {
            http.put().uri(uri, vars)
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve().toBodilessEntity();
        } catch (Exception e) {
            throw new KeycloakAdminException("PUT " + uri + " falló: " + e.getMessage(), e);
        }
    }

    private void adminDelete(String token, String uri, Object... vars) {
        try {
            http.delete().uri(uri, vars)
                    .header("Authorization", "Bearer " + token)
                    .retrieve().toBodilessEntity();
        } catch (Exception e) {
            throw new KeycloakAdminException("DELETE " + uri + " falló: " + e.getMessage(), e);
        }
    }

    /** DELETE con body (Keycloak lo usa para quitar role-mappings). */
    private void adminDeleteBody(String token, String uri, Object body, Object... vars) {
        try {
            http.method(org.springframework.http.HttpMethod.DELETE).uri(uri, vars)
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve().toBodilessEntity();
        } catch (Exception e) {
            throw new KeycloakAdminException("DELETE(body) " + uri + " falló: " + e.getMessage(), e);
        }
    }

    private static String text(JsonNode n, String field) {
        JsonNode v = n.path(field);
        return v.isMissingNode() || v.isNull() ? null : v.asText();
    }

    private static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
