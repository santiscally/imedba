package com.imedba.modules.collection.dto;

import java.util.UUID;

/**
 * Venta de una colección. Genera N book_sales (una por libro), repartiendo el precio
 * de la colección proporcional al precio de lista de cada libro. Reunión 2026-06-05.
 */
public record CollectionSellRequest(
        UUID studentId,
        UUID enrollmentId,
        Boolean applyStudentDiscount
) {}
