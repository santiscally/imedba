package com.imedba.modules.staff.entity;

/**
 * Rol dentro del personal académico.
 *
 * <p>{@code DIRECTORA} se agregó en V034: las directoras de PREMA se cargan como
 * personal académico y la liquidación de la diplomatura las referencia desde acá,
 * en lugar de pedir un «% de directora» al crear la diplomatura
 * ({@code correcciones-imedba-20260723.docx}).
 *
 * <p>{@code TUTORA} se sacó en V036: una tutora es una docente que además hace
 * seguimiento, no un rol distinto. Pasó a ser el flag {@code Staff.tutor}.
 */
public enum StaffType {
    DOCENTE,
    PRECEPTORA,
    DIRECTORA
}
