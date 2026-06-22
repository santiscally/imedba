package com.imedba.modules.moodle.dto;

import java.util.List;
import java.util.UUID;

/**
 * Fila del export "alumnos no vinculados con Moodle": alumnos sin {@code moodle_user_id}
 * junto con los cursos a los que están inscriptos. Es el insumo para que David los cree /
 * alinee en Moodle y luego se corra {@code link-all} para vincularlos por email.
 */
public record UnlinkedStudentRow(
        UUID studentId,
        String firstName,
        String lastName,
        String email,
        String dni,
        String phone,
        List<String> courses
) {}
