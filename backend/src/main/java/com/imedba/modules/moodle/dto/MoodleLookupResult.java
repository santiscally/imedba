package com.imedba.modules.moodle.dto;

/**
 * Resultado de validar un email contra Moodle SIN alumno persistido (botón "Validar
 * con Moodle" del alta de alumno). A diferencia de {@link MoodleLinkResult}, no toca la
 * DB: sólo informa si el email ya tiene cuenta en Moodle, para que el front guarde el
 * {@code moodleUserId} al crear (o cree igual si todavía no existe en Moodle).
 *
 * <p>Es una operación de SÓLO LECTURA contra Moodle: no suspende ni modifica nada.</p>
 */
public record MoodleLookupResult(
        boolean enabled,
        boolean found,
        Integer moodleUserId,
        String fullname,
        Boolean suspended,
        String message
) {
    public static MoodleLookupResult disabled() {
        return new MoodleLookupResult(false, false, null, null, null,
                "Integración Moodle deshabilitada (moodle.enabled=false)");
    }

    public static MoodleLookupResult notFound(String email) {
        return new MoodleLookupResult(true, false, null, null, null,
                "No existe todavía una cuenta de Moodle con el email " + email
                        + ". Podés crear el alumno igual y vincularlo más tarde.");
    }

    public static MoodleLookupResult found(int moodleUserId, String fullname, Boolean suspended) {
        return new MoodleLookupResult(true, true, moodleUserId, fullname, suspended,
                "Encontrado en Moodle (ID " + moodleUserId + ")"
                        + (Boolean.TRUE.equals(suspended) ? " — cuenta SUSPENDIDA" : ""));
    }
}
