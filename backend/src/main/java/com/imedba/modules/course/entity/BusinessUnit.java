package com.imedba.modules.course.entity;

/**
 * Unidades de negocio del instituto. Se persisten como VARCHAR en {@code courses.business_unit}
 * y en {@code budget_entries.business_unit} (Fase 5).
 */
public enum BusinessUnit {
    RESIDENCIAS,
    PREMATUROS,
    EDITORIAL,
    FORMACION_SUPERIOR,
    OTROS
}
