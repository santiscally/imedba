package com.imedba.modules.moodle.client;

import com.imedba.modules.moodle.dto.MoodleGradeItem;
import com.imedba.modules.moodle.dto.MoodleUser;
import java.util.List;
import java.util.Optional;

/**
 * Abstracción del Web Service REST de Moodle. Una sola implementación activa por
 * contexto: {@link HttpMoodleClient} si {@code moodle.enabled=true}, de lo
 * contrario el bean inerte de {@code DisabledMoodleClientConfig}.
 */
public interface MoodleClient {

    /** true si la integración está activa (token + URL cargados y flag prendido). */
    boolean isEnabled();

    /**
     * Busca el usuario de Moodle cuyo email coincide ({@code core_user_get_users_by_field}
     * con {@code field=email}). Es el mecanismo de vínculo: en esta plataforma los alumnos
     * se dan de alta independientes de Moodle, así que el email es la clave común.
     *
     * @return el usuario si existe exactamente uno; vacío si Moodle no devuelve ninguno.
     */
    Optional<MoodleUser> findUserByEmail(String email) throws MoodleException;

    /**
     * Suspende o reactiva la CUENTA de usuario en Moodle (no desmatricula del curso).
     * Decisión de David (reunión 2026-05-29): la suspensión por mora se hace a nivel
     * de cuenta vía {@code core_user_update_users} con {@code suspended} 0/1.
     */
    void setUserSuspended(int moodleUserId, boolean suspended) throws MoodleException;

    /** Lista los usuarios matriculados en un curso ({@code core_enrol_get_enrolled_users}). */
    List<MoodleUser> getEnrolledUsers(int moodleCourseId) throws MoodleException;

    /** Notas de un alumno en un curso ({@code gradereport_user_get_grade_items}). */
    List<MoodleGradeItem> getUserCourseGrades(int moodleCourseId, int moodleUserId) throws MoodleException;
}
