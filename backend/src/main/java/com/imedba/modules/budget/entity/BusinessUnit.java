package com.imedba.modules.budget.entity;

/**
 * Fase 9.a (V015): unificado con {@link com.imedba.modules.course.entity.BusinessUnit}.
 * Se eliminó {@code PREMATUROS} (datos migrados a {@code FORMACION_SUPERIOR}).
 */
public enum BusinessUnit {
    RESIDENCIAS,
    EDITORIAL,
    FORMACION_SUPERIOR,
    GENERAL
}
