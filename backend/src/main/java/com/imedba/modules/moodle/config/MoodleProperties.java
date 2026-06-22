package com.imedba.modules.moodle.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuración de la integración con Moodle (LMS). Todo viene por variables de
 * entorno; en dev y mientras no haya token de David, {@code enabled=false} y la
 * integración queda inerte (ver {@code DisabledMoodleClientConfig}).
 *
 * <p>Vars: {@code MOODLE_ENABLED}, {@code MOODLE_URL}, {@code MOODLE_TOKEN},
 * {@code MOODLE_DEFAULT_STUDENT_ROLE_ID}.</p>
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "moodle")
public class MoodleProperties {

    /** Feature flag global. Si false (default), no se hace ninguna llamada a Moodle. */
    private boolean enabled = false;

    /** Base URL de la instancia Moodle, ej. {@code https://campus.imedba.edu.ar} (sin slash final). */
    private String baseUrl = "";

    /** Token del Web Service REST de Moodle. Lo provee David (admin Moodle). */
    private String token = "";

    /** roleid del rol "Student" en Moodle (5 en instalaciones estándar). */
    private int defaultStudentRoleId = 5;

    /**
     * Permiso para que el scheduler suspenda morosos en MASA automáticamente. Es un flag
     * separado de {@code enabled} a propósito: permite prender la integración (lookup,
     * vincular, suspender/reactivar MANUAL) sin que el job de las 06:10 + el catch-up al
     * arranque suspendan alumnos reales. Recién se pone en {@code true} cuando la
     * integración está validada en producción (ver rollout en doc 05-moodle-integration-spec).
     */
    private boolean autoSuspendEnabled = false;

    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 10000;

    /** true sólo si está habilitado Y tiene baseUrl + token cargados. */
    public boolean isConfigured() {
        return enabled
                && baseUrl != null && !baseUrl.isBlank()
                && token != null && !token.isBlank();
    }
}
