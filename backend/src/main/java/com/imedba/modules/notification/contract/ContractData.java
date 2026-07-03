package com.imedba.modules.notification.contract;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Datos variables que se inyectan en el template del contrato de matrícula.
 * El texto de las 13 cláusulas es fijo; sólo varían estos campos por alumno/curso.
 * Mapeo a entidades en {@code 15-contrato-alumno-template.md}.
 *
 * @param discountLabel descuento ya formateado por el caller ("15%" o "$50.000" o "—"),
 *                      porque puede expresarse en porcentaje o monto fijo.
 * @param groupStart    inicio del grupo; {@code null} → se renderiza "A confirmar"
 *                      (el backend todavía no modela start/end de curso).
 */
public record ContractData(
        String firstName,
        String lastName,
        String nationality,
        String dni,
        LocalDate birthDate,
        String email,
        BigDecimal courseValue,
        BigDecimal totalAmount,
        String discountLabel,
        String groupName,
        LocalDate groupStart,
        LocalDate groupEnd) {
}
