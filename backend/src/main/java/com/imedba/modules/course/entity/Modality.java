package com.imedba.modules.course.entity;

/**
 * Modalidad de cursado (V038): si el alumno cursa por su cuenta o con clases en vivo.
 *
 * <p>Antes de V038, {@code courses.modality} era texto libre y mezclaba tres cosas:
 * la modalidad real, el tipo de curso (TRADICIONAL, SUPER_INTENSIVO…) y el producto
 * de Formación Superior («Diplomatura Prematuros»). Con los tres en una columna no
 * había forma de agrupar, que es justamente lo que el cliente pidió poder hacer.
 */
public enum Modality {
    LIBRE,
    VIVO
}
