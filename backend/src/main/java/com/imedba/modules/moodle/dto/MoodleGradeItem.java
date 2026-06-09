package com.imedba.modules.moodle.dto;

/**
 * Ítem de calificación de un alumno en un curso, tal como lo devuelve
 * {@code gradereport_user_get_grade_items} (segunda capa de la integración:
 * lectura de notas). {@code graderaw} puede ser null si el alumno no tiene nota
 * cargada en ese ítem.
 */
public record MoodleGradeItem(
        Integer id,
        String itemName,
        String itemType,
        Double gradeRaw,
        String gradeFormatted,
        Double gradeMin,
        Double gradeMax,
        String percentageFormatted
) {}
