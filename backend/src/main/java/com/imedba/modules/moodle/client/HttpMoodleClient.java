package com.imedba.modules.moodle.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.imedba.modules.moodle.config.MoodleProperties;
import com.imedba.modules.moodle.dto.MoodleGradeItem;
import com.imedba.modules.moodle.dto.MoodleUser;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Cliente HTTP real del Web Service de Moodle. Activo sólo con {@code moodle.enabled=true}.
 *
 * <p>Protocolo: POST form-urlencoded a {@code {baseUrl}/webservice/rest/server.php} con
 * {@code wstoken}, {@code wsfunction}, {@code moodlewsrestformat=json} + los args de la
 * función. Moodle responde HTTP 200 aun en errores funcionales (objeto con
 * {@code exception}/{@code errorcode}/{@code message}); eso se detecta y se lanza
 * {@link MoodleException}.</p>
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "moodle", name = "enabled", havingValue = "true")
public class HttpMoodleClient implements MoodleClient {

    private static final String REST_PATH = "/webservice/rest/server.php";

    private final MoodleProperties props;
    private final RestClient http;
    private final ObjectMapper mapper = new ObjectMapper();

    public HttpMoodleClient(MoodleProperties props) {
        this.props = props;
        if (props.getBaseUrl() == null || props.getBaseUrl().isBlank()) {
            throw new IllegalStateException("moodle.enabled=true pero moodle.base-url está vacío");
        }
        if (props.getToken() == null || props.getToken().isBlank()) {
            throw new IllegalStateException("moodle.enabled=true pero moodle.token está vacío");
        }
        SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
        rf.setConnectTimeout(Duration.ofMillis(props.getConnectTimeoutMs()));
        rf.setReadTimeout(Duration.ofMillis(props.getReadTimeoutMs()));
        this.http = RestClient.builder()
                .baseUrl(stripTrailingSlash(props.getBaseUrl()))
                .requestFactory(rf)
                .build();
        log.info("HttpMoodleClient activo — baseUrl={}", stripTrailingSlash(props.getBaseUrl()));
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public Optional<MoodleUser> findUserByEmail(String email) {
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }
        MultiValueMap<String, String> form = baseForm("core_user_get_users_by_field");
        form.add("field", "email");
        form.add("values[0]", email.trim());
        JsonNode root = call(form);
        if (root == null || !root.isArray() || root.isEmpty()) {
            return Optional.empty();
        }
        JsonNode u = root.get(0); // email es único en Moodle → a lo sumo un match
        return Optional.of(new MoodleUser(
                intOrNull(u, "id"),
                text(u, "username"),
                text(u, "firstname"),
                text(u, "lastname"),
                text(u, "fullname"),
                text(u, "email"),
                intOrNull(u, "suspended")));
    }

    @Override
    public void setUserSuspended(int moodleUserId, boolean suspended) {
        MultiValueMap<String, String> form = baseForm("core_user_update_users");
        form.add("users[0][id]", String.valueOf(moodleUserId));
        form.add("users[0][suspended]", suspended ? "1" : "0");
        call(form); // éxito → cuerpo vacío/null
        log.info("Moodle: usuario {} suspended={}", moodleUserId, suspended);
    }

    @Override
    public List<MoodleUser> getEnrolledUsers(int moodleCourseId) {
        MultiValueMap<String, String> form = baseForm("core_enrol_get_enrolled_users");
        form.add("courseid", String.valueOf(moodleCourseId));
        JsonNode root = call(form);
        List<MoodleUser> out = new ArrayList<>();
        if (root != null && root.isArray()) {
            for (JsonNode u : root) {
                out.add(new MoodleUser(
                        intOrNull(u, "id"),
                        text(u, "username"),
                        text(u, "firstname"),
                        text(u, "lastname"),
                        text(u, "fullname"),
                        text(u, "email"),
                        intOrNull(u, "suspended")));
            }
        }
        return out;
    }

    @Override
    public List<MoodleGradeItem> getUserCourseGrades(int moodleCourseId, int moodleUserId) {
        MultiValueMap<String, String> form = baseForm("gradereport_user_get_grade_items");
        form.add("courseid", String.valueOf(moodleCourseId));
        form.add("userid", String.valueOf(moodleUserId));
        JsonNode root = call(form);
        List<MoodleGradeItem> out = new ArrayList<>();
        if (root == null) {
            return out;
        }
        JsonNode usergrades = root.path("usergrades");
        if (!usergrades.isArray()) {
            return out;
        }
        for (JsonNode ug : usergrades) {
            JsonNode items = ug.path("gradeitems");
            if (!items.isArray()) {
                continue;
            }
            for (JsonNode gi : items) {
                out.add(new MoodleGradeItem(
                        intOrNull(gi, "id"),
                        text(gi, "itemname"),
                        text(gi, "itemtype"),
                        doubleOrNull(gi, "graderaw"),
                        text(gi, "gradeformatted"),
                        doubleOrNull(gi, "grademin"),
                        doubleOrNull(gi, "grademax"),
                        text(gi, "percentageformatted")));
            }
        }
        return out;
    }

    private MultiValueMap<String, String> baseForm(String wsfunction) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("wstoken", props.getToken());
        form.add("wsfunction", wsfunction);
        form.add("moodlewsrestformat", "json");
        return form;
    }

    private JsonNode call(MultiValueMap<String, String> form) {
        String wsfunction = form.getFirst("wsfunction");
        try {
            String raw = http.post()
                    .uri(REST_PATH)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(String.class);
            if (raw == null || raw.isBlank() || "null".equals(raw.trim())) {
                return null; // funciones tipo update devuelven null en éxito
            }
            JsonNode node = mapper.readTree(raw);
            if (node.has("exception")) {
                throw new MoodleException(String.format(
                        "Moodle %s error %s: %s",
                        wsfunction, node.path("errorcode").asText(), node.path("message").asText()));
            }
            return node;
        } catch (MoodleException e) {
            throw e;
        } catch (Exception e) {
            throw new MoodleException("Fallo llamando a Moodle " + wsfunction, e);
        }
    }

    private static String text(JsonNode n, String field) {
        JsonNode v = n.path(field);
        return v.isMissingNode() || v.isNull() ? null : v.asText();
    }

    private static Integer intOrNull(JsonNode n, String field) {
        JsonNode v = n.path(field);
        return v.isMissingNode() || v.isNull() ? null : v.asInt();
    }

    private static Double doubleOrNull(JsonNode n, String field) {
        JsonNode v = n.path(field);
        return v.isMissingNode() || v.isNull() ? null : v.asDouble();
    }

    private static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
