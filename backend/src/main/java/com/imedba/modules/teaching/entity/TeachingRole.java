package com.imedba.modules.teaching.entity;

/**
 * Con qué rol se liquida a una persona en un mes.
 *
 * <p>Una misma persona puede dar clases como docente en unas y acompañar como
 * preceptora en otras: son <b>dos liquidaciones separadas</b>, porque el valor
 * hora y la fórmula son distintos (la preceptora suma 0,25 h por clase).
 */
public enum TeachingRole {
    DOCENTE,
    PRECEPTORA
}
