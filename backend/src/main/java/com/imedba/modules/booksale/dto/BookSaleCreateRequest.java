package com.imedba.modules.booksale.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record BookSaleCreateRequest(
        @NotNull UUID bookId,
        UUID studentId,
        UUID enrollmentId,
        @NotNull @Min(1) Integer quantity,
        /** Si es true, aplica el descuento de alumno (book.studentDiscountPct) al precio base. */
        Boolean applyStudentDiscount,
        /**
         * Descuento explícito en % (promo/campaña o manual, reunión 12-jun §3.1). Si viene > 0,
         * tiene prioridad sobre {@code applyStudentDiscount}.
         */
        @DecimalMin("0.00") @DecimalMax("100.00") @Digits(integer = 3, fraction = 2) BigDecimal discountPercentage,
        String notes
) {}
