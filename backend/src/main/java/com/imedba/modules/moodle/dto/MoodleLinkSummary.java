package com.imedba.modules.moodle.dto;

import java.util.List;

/**
 * Resumen de un vínculo masivo por email sobre todos los alumnos aún sin
 * {@code moodleUserId}. {@code results} trae el detalle por alumno procesado.
 */
public record MoodleLinkSummary(
        int processed,
        int linked,
        int notFound,
        List<MoodleLinkResult> results
) {}
