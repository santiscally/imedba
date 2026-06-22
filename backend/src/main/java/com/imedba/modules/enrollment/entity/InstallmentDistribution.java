package com.imedba.modules.enrollment.entity;

/**
 * Modo de distribución de las cuotas al crear una inscripción (reunión 2026-06-12,
 * 3ra opción pedida por Nico). Es una instrucción de cálculo: NO se persiste en la
 * inscripción, sólo determina cómo el {@code InstallmentGenerator} arma el cronograma.
 */
public enum InstallmentDistribution {

    /** Matrícula como cuota 0 + curso (con descuento) en N cuotas; libros aparte (book_sales). Default. */
    SEPARATE,

    /** Curso + matrícula + libros, todo sumado en N cuotas iguales (sin cuota 0 de matrícula). */
    TOTAL,

    /** Curso + matrícula en N cuotas iguales (sin cuota 0); libros aparte (book_sales). */
    COURSE_AND_FEE
}
