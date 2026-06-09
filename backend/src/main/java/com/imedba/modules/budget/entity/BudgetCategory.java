package com.imedba.modules.budget.entity;

public enum BudgetCategory {
    // Genéricos / legacy
    FIXED,
    VARIABLE,
    MAINTENANCE,

    // Ingresos
    INCOME_SALES,
    INCOME_ENROLLMENT,
    INCOME_OTHER,

    // Egresos por área (reunión IMEDBA 2026-06-05, Nico — desglose de gastos)
    SALARIES,         // sueldos
    SUPPLIERS,        // proveedores (monotributistas)
    TEACHERS,         // docentes y tutores/tutoras
    ADVERTISING,      // publicidad
    OFFICE,           // oficina y servicios (alquiler, servicios, papelería)
    TRAVEL,           // viajes / viáticos
    EDITORIAL_COSTS,  // editorial (impresión de libros, autoría)
    SUBSCRIPTIONS,    // abonos (ej. Clau)
    TAXES,            // impuestos
    BANK_FEES,        // gastos bancarios / de plataforma

    OTHER             // gastos varios
}
