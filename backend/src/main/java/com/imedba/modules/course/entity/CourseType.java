package com.imedba.modules.course.entity;

/**
 * Tipo de curso (V038). Uno de los tres ejes con los que IMEDBA diferencia sus
 * cursos, junto con el <b>nombre</b> (editable: Tucumán, Córdoba, Junio/Julio…) y
 * la {@link Modality}.
 *
 * <p><i>«Tipo de curso: Normal (o sin detalle, es el curso anual clásico),
 * Intensivo y Choice»</i> — correcciones 2026-07-23.
 *
 * <p>Reválida y «banco de preguntas» NO son tipos de curso: son productos aparte
 * y se distinguen por el nombre.
 */
public enum CourseType {
    /** El curso anual clásico. Es lo que el cliente llama «normal o sin detalle». */
    NORMAL,
    INTENSIVO,
    CHOICE
}
