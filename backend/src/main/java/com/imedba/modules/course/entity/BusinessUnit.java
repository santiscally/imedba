package com.imedba.modules.course.entity;

/**
 * Unidades de negocio del instituto. Se persisten como VARCHAR en
 * {@code courses.business_unit} y en {@code budget_entries.business_unit}.
 *
 * Fase 9.a (V015): unificado con {@link com.imedba.modules.budget.entity.BusinessUnit}.
 * Antes existía {@code PREMATUROS} (migrado a {@code FORMACION_SUPERIOR}) y
 * {@code OTROS} (renombrado a {@code GENERAL}).
 */
public enum BusinessUnit {
    RESIDENCIAS,
    EDITORIAL,
    FORMACION_SUPERIOR,
    GENERAL
}
