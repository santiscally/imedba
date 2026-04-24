package com.imedba.modules.booksale.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record BookSaleCreateRequest(
        @NotNull UUID bookId,
        UUID studentId,
        UUID enrollmentId,
        @NotNull @Min(1) Integer quantity,
        /** Si es true, aplica el descuento al precio base del libro. */
        Boolean applyStudentDiscount,
        String notes
) {}
