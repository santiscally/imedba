package com.imedba.modules.staff.entity;

/**
 * Unidad de negocio en la que trabaja la persona (V034).
 *
 * <p>Nico, 2026-07-24 (23:44): <i>"y si es de residencia, si es de prema o si es de
 * ambas, para incluir todo"</i>. Hace falta porque la liquidación de horas docentes
 * mezcla las dos unidades: <i>"la de hora docente tiene de los dos… tengo prema acá
 * y residencias médicas que lo dio este"</i> (24:12).
 *
 * <p>Ojo al filtrar: buscar por una unidad concreta tiene que incluir {@link #AMBAS}.
 * Ver {@code StaffSpecs.bySegment}.
 */
public enum StaffSegment {
    RESIDENCIAS,
    FORMACION_SUPERIOR,
    AMBAS
}
