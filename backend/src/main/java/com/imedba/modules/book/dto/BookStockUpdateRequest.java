package com.imedba.modules.book.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Ajuste manual de stock (recepción de imprenta, corrección de inventario). Valor absoluto. */
public record BookStockUpdateRequest(
        @NotNull @Min(0) Integer stockQuantity,
        String reason
) {}
