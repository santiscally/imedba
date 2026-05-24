package com.imedba.modules.dashboard.dto;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Ítem del feed "Actividad reciente" del Dashboard.
 * Contrato espejado del mock del SPA (handlers.ts:955).
 *
 * <p>{@code type} es uno de:
 * <ul>
 *   <li>{@code payment}    — pago registrado</li>
 *   <li>{@code enrollment} — inscripción creada</li>
 *   <li>{@code sale}       — venta de libro</li>
 * </ul>
 *
 * <p>{@code amount} puede ser null para inscripciones (solo aplica a payment/sale).
 */
public record ActivityItemResponse(
        String id,
        String type,
        String title,
        String detail,
        BigDecimal amount,
        Instant date
) {}
