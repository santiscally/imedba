package com.imedba.modules.installment.service;

import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.enrollment.entity.InstallmentDistribution;
import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * Crea el cronograma de cuotas para una inscripción recién creada.
 *
 * Reglas modo {@code SEPARATE} (default):
 *   - Si hay enrollmentFee > 0 se crea una cuota con number=0 y due_date = enrollment_date.
 *   - El resto del precio (finalPrice - enrollmentFee) se divide en numInstallments partes iguales,
 *     ajustando la última cuota para absorber redondeo.
 *   - Los libros (bookPrice) NO entran en cuotas: se cobran aparte en {@code book_sales}.
 *
 * Reglas modos agrupados ({@code TOTAL} y {@code COURSE_AND_FEE}, reunión 2026-06-05/12):
 *   - Suma {@code finalPrice (curso con descuento) + enrollmentFee (matrícula sin descuento)} +
 *     {@code bookPrice} sólo en {@code TOTAL} (en {@code COURSE_AND_FEE} los libros van aparte),
 *     y la divide en numInstallments cuotas iguales, sin cuota 0 (matrícula) separada.
 *   - Primera cuota vence el día del grupo de pago (10 o 20) del mes corriente o siguiente.
 *
 * El día de vencimiento de cada cuota lo define el grupo de pago de la inscripción
 * (reunión 2026-06-05): GROUP_1 → día 10, GROUP_2 → día 20. Cada cuota vence ese día
 * del mes siguiente a la anterior.
 * Zona horaria: {@code America/Argentina/Buenos_Aires} al convertir enrollmentDate a LocalDate.
 */
public final class InstallmentGenerator {

    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final int DEFAULT_DUE_DAY = 10;

    private InstallmentGenerator() {}

    public static List<Installment> generate(Enrollment e) {
        return generate(e, InstallmentDistribution.SEPARATE);
    }

    public static List<Installment> generate(Enrollment e, InstallmentDistribution mode) {
        LocalDate enrollmentDay = e.getEnrollmentDate().atZone(ZONE).toLocalDate();
        return switch (mode != null ? mode : InstallmentDistribution.SEPARATE) {
            case TOTAL          -> generateGrouped(e, enrollmentDay, true);
            case COURSE_AND_FEE -> generateGrouped(e, enrollmentDay, false);
            case SEPARATE       -> generateDefault(e, enrollmentDay);
        };
    }

    private static List<Installment> generateDefault(Enrollment e, LocalDate enrollmentDay) {
        List<Installment> out = new ArrayList<>();

        BigDecimal fee = e.getEnrollmentFee() != null ? e.getEnrollmentFee() : BigDecimal.ZERO;
        BigDecimal financedTotal = e.getFinalPrice().subtract(fee);
        if (financedTotal.signum() < 0) {
            financedTotal = BigDecimal.ZERO;
        }

        if (fee.signum() > 0) {
            out.add(buildInstallment(e, 0, fee, enrollmentDay));
        }

        int n = e.getNumInstallments() != null ? e.getNumInstallments() : 1;
        if (n < 1 || financedTotal.signum() <= 0) {
            return out;
        }

        BigDecimal base = financedTotal.divide(BigDecimal.valueOf(n), 2, RoundingMode.DOWN);
        BigDecimal sumOfBase = base.multiply(BigDecimal.valueOf(n));
        BigDecimal remainder = financedTotal.subtract(sumOfBase);

        LocalDate cursor = firstInstallmentDueDate(enrollmentDay, dueDayOf(e));
        for (int i = 1; i <= n; i++) {
            BigDecimal amount = (i == n) ? base.add(remainder) : base;
            out.add(buildInstallment(e, i, amount, cursor));
            cursor = cursor.plusMonths(1);
        }
        return out;
    }

    private static List<Installment> generateGrouped(Enrollment e, LocalDate enrollmentDay, boolean includeBooks) {
        List<Installment> out = new ArrayList<>();

        // Modo "agrupar" (reunión 2026-06-05/12, Nico): suma curso (con descuento) + matrícula
        // (SIN descuento) [+ libros sólo si includeBooks] y lo divide en N cuotas iguales. finalPrice
        // ya tiene el descuento aplicado al curso; enrollmentFee se suma entero. Con includeBooks=false
        // (opción "libros aparte") los libros NO entran en las cuotas: van a book_sales.
        BigDecimal finalPrice = e.getFinalPrice() != null ? e.getFinalPrice() : BigDecimal.ZERO;
        BigDecimal fee = e.getEnrollmentFee() != null ? e.getEnrollmentFee() : BigDecimal.ZERO;
        BigDecimal bookPrice = includeBooks && e.getBookPrice() != null ? e.getBookPrice() : BigDecimal.ZERO;
        BigDecimal grandTotal = finalPrice.add(fee).add(bookPrice);
        if (grandTotal.signum() <= 0) {
            return out;
        }

        int n = e.getNumInstallments() != null ? e.getNumInstallments() : 1;
        if (n < 1) {
            return out;
        }

        BigDecimal base = grandTotal.divide(BigDecimal.valueOf(n), 2, RoundingMode.DOWN);
        BigDecimal sumOfBase = base.multiply(BigDecimal.valueOf(n));
        BigDecimal remainder = grandTotal.subtract(sumOfBase);

        LocalDate cursor = firstInstallmentDueDate(enrollmentDay, dueDayOf(e));
        for (int i = 1; i <= n; i++) {
            BigDecimal amount = (i == n) ? base.add(remainder) : base;
            out.add(buildInstallment(e, i, amount, cursor));
            cursor = cursor.plusMonths(1);
        }
        return out;
    }

    /** Día de vencimiento según el grupo de pago de la inscripción (default 10). */
    private static int dueDayOf(Enrollment e) {
        return e.getPaymentGroup() != null ? e.getPaymentGroup().dueDay() : DEFAULT_DUE_DAY;
    }

    private static LocalDate firstInstallmentDueDate(LocalDate enrollmentDay, int dueDay) {
        LocalDate sameMonthDue = enrollmentDay.withDayOfMonth(
                Math.min(dueDay, enrollmentDay.lengthOfMonth()));
        if (!sameMonthDue.isBefore(enrollmentDay)) {
            return sameMonthDue;
        }
        LocalDate nextMonth = enrollmentDay.plusMonths(1);
        return nextMonth.withDayOfMonth(Math.min(dueDay, nextMonth.lengthOfMonth()));
    }

    private static Installment buildInstallment(
            Enrollment e, int number, BigDecimal amount, LocalDate dueDate) {
        return Installment.builder()
                .enrollment(e)
                .number(number)
                .amount(amount)
                .surchargeAmount(BigDecimal.ZERO)
                .dueDate(dueDate)
                .status(InstallmentStatus.PENDING)
                .build();
    }
}
