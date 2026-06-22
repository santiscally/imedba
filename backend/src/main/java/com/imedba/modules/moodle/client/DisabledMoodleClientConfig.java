package com.imedba.modules.moodle.client;

import com.imedba.modules.moodle.dto.MoodleGradeItem;
import com.imedba.modules.moodle.dto.MoodleUser;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Provee un {@link MoodleClient} inerte cuando {@code moodle.enabled=false} (default)
 * o cuando no se creó {@link HttpMoodleClient}. No hace ninguna llamada de red: las
 * suspensiones/activaciones se loguean y las lecturas devuelven listas vacías.
 *
 * <p>Permite tener TODO el cableado (hook de suspensión, controller, service) en su
 * lugar sin token de David: el día que llegue, sólo hay que setear las env vars.</p>
 */
@Slf4j
@Configuration
class DisabledMoodleClientConfig {

    @Bean
    @ConditionalOnMissingBean(MoodleClient.class)
    MoodleClient disabledMoodleClient() {
        log.warn("MoodleClient DESHABILITADO (moodle.enabled=false) — operaciones Moodle se loguean pero no se ejecutan.");
        return new MoodleClient() {
            @Override
            public boolean isEnabled() {
                return false;
            }

            @Override
            public Optional<MoodleUser> findUserByEmail(String email) {
                log.info("[moodle-disabled] findUserByEmail(email={}) → empty", email);
                return Optional.empty();
            }

            @Override
            public Optional<MoodleUser> findUserById(int moodleUserId) {
                log.info("[moodle-disabled] findUserById(userId={}) → empty", moodleUserId);
                return Optional.empty();
            }

            @Override
            public void setUserSuspended(int moodleUserId, boolean suspended) {
                log.info("[moodle-disabled] setUserSuspended(userId={}, suspended={}) ignorado", moodleUserId, suspended);
            }

            @Override
            public List<MoodleUser> getEnrolledUsers(int moodleCourseId) {
                log.info("[moodle-disabled] getEnrolledUsers(courseId={}) → []", moodleCourseId);
                return List.of();
            }

            @Override
            public List<MoodleGradeItem> getUserCourseGrades(int moodleCourseId, int moodleUserId) {
                log.info("[moodle-disabled] getUserCourseGrades(courseId={}, userId={}) → []", moodleCourseId, moodleUserId);
                return List.of();
            }
        };
    }
}
