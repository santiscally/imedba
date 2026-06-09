package com.imedba.modules.moodle.dto;

/**
 * Usuario de Moodle tal como lo devuelve {@code core_enrol_get_enrolled_users}.
 * {@code suspended} = 1 si la cuenta está suspendida, 0 activa (null si la versión
 * de Moodle no lo expone en ese endpoint).
 */
public record MoodleUser(
        Integer id,
        String username,
        String firstname,
        String lastname,
        String fullname,
        String email,
        Integer suspended
) {}
