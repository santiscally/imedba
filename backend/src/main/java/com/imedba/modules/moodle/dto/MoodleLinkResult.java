package com.imedba.modules.moodle.dto;

import java.util.UUID;

/**
 * Resultado de intentar vincular un alumno con su cuenta de Moodle por email.
 *
 * <p>{@code linked=true} si se encontró el usuario en Moodle y se guardó su
 * {@code moodleUserId} en el alumno. {@code linked=false} con {@code moodleUserId=null}
 * si no hubo match (o si la integración está deshabilitada); el detalle va en
 * {@code message}.</p>
 */
public record MoodleLinkResult(
        UUID studentId,
        String email,
        boolean linked,
        Integer moodleUserId,
        String message
) {
    public static MoodleLinkResult linked(UUID studentId, String email, int moodleUserId) {
        return new MoodleLinkResult(studentId, email, true, moodleUserId,
                "Vinculado con Moodle user " + moodleUserId);
    }

    public static MoodleLinkResult notFound(UUID studentId, String email) {
        return new MoodleLinkResult(studentId, email, false, null,
                "No se encontró ningún usuario de Moodle con el email " + email);
    }

    public static MoodleLinkResult disabled(UUID studentId, String email) {
        return new MoodleLinkResult(studentId, email, false, null,
                "Integración Moodle deshabilitada (moodle.enabled=false)");
    }
}
