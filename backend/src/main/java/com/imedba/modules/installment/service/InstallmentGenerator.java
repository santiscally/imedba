package com.imedba.modules.installment.service;

import com.imedba.modules.enrollment.entity.Enrollment;
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
 * Reglas modo default ({@code useTotalDistribution = false}):
 *   - Si hay enrollmentFee > 0 se crea una cuota con number=0 y due_date = enrollment_date.
 *   - El resto del precio (finalPrice - enrollmentFee) se divide en numInstallments partes iguales,
 *     ajustando la última cuota para absorber redondeo.
 *   - Los libros (bookPrice) NO entran en cuotas: se cobran aparte en {@code book_sales}.
 *
 * Reglas modo "Suma total" ({@code useTotalDistribution = true}, reunión 2026-05-22 §2.3):
 *   - Suma {@code finalPrice + bookPrice} (matrícula y libros incluidos) y la divide en
 *     numInstallments cuotas iguales, sin cuota 0 separada.
 *   - Primera cuota vence al día siguiente al estilo del modo default (día 10 del mes corriente o siguiente).
 *
 * En ambos casos cada cuota vence el día 10 del mes siguiente al anterior.
 * Zona horaria: {@code America/Argentina/Buenos_Aires} al convertir enrollmentDate a LocalDate.
 */
public final class InstallmentGenerator {

    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final int DEFAULT_DUE_DAY = 10;

    private InstallmentGenerator() {}

    public static List<Installment> generate(Enrollment e) {
        return generate(e, false);
    }

    public static List<Installment> generate(Enrollment e, boolean useTotalDistribution) {
        LocalDate enrollmentDay = e.getEnrollmentDate().atZone(ZONE).toLocalDate();
        if (useTotalDistribution) {
            return generateTotalDistribution(e, enrollmentDay);
        }
        return generateDefault(e, enrollmentDay);
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

        LocalDate cursor = firstInstallmentDueDate(enrollmentDay);
        for (int i = 1; i <= n; i++) {
            BigDecimal amount = (i == n) ? base.add(remainder) : base;
            out.add(buildInstallment(e, i, amount, cursor));
            cursor = cursor.plusMonths(1);
        }
        return out;
    }

    private static List<Installment> generateTotalDistribution(Enrollment e, LocalDate enrollmentDay) {
        List<Installment> out = new ArrayList<>();

        BigDecimal finalPrice = e.getFinalPrice() != null ? e.getFinalPrice() : BigDecimal.ZERO;
        BigDecimal bookPrice = e.getBookPrice() != null ? e.getBookPrice() : BigDecimal.ZERO;
        BigDecimal grandTotal = finalPrice.add(bookPrice);
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

        LocalDate cursor = firstInstallmentDueDate(enrollmentDay);
        for (int i = 1; i <= n; i++) {
            BigDecimal amount = (i == n) ? base.add(remainder) : base;
            out.add(buildInstallment(e, i, amount, cursor));
            cursor = cursor.plusMonths(1);
        }
        return out;
    }

    private static LocalDate firstInstallmentDueDate(LocalDate enrollmentDay) {
        LocalDate sameMonthDue = enrollmentDay.withDayOfMonth(
                Math.min(DEFAULT_DUE_DAY, enrollmentDay.lengthOfMonth()));
        if (!sameMonthDue.isBefore(enrollmentDay)) {
            return sameMonthDue;
        }
        LocalDate nextMonth = enrollmentDay.plusMonths(1);
        return nextMonth.withDayOfMonth(Math.min(DEFAULT_DUE_DAY, nextMonth.lengthOfMonth()));
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
