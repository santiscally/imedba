package com.imedba.modules.activitytype.entity;

/**
 * A qué rol aplica una tarifa por hora.
 *
 * <p>Tiene que coincidir con el CHECK de {@code activity_types.applies_to}
 * (V036/V037). {@code TUTORA} se sacó en V036 —una tutora es una docente que
 * además hace seguimiento, no un rol aparte— y se sumaron {@code PRECEPTORA} y
 * {@code DIRECTORA}, que sí tienen valor hora propio.
 */
public enum AppliesTo {
    DOCENTE,
    PRECEPTORA,
    DIRECTORA,
    ALL
}
