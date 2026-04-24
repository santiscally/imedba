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
 * Reglas:
 *   - Si hay enrollmentFee > 0 se crea una cuota con number=0 y due_date = enrollment_date.
 *   - El resto del precio (finalPrice - enrollmentFee) se divide en numInstallments partes iguales,
 *     ajustando la última cuota para absorber redondeo.
 *   - Los libros (bookPrice) NO entran en cuotas: se cobran aparte en {@code book_sales}.
 *   - Cada cuota vence el día 10 del mes siguiente al anterior (convención del negocio).
 *
 * Zona horaria: {@code America/Argentina/Buenos_Aires} al convertir enrollmentDate a LocalDate.
 */
public final class InstallmentGenerator {

    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final int DEFAULT_DUE_DAY = 10;

    private InstallmentGenerator() {}

    public static List<Installment> generate(Enrollment e) {
        List<Installment> out = new ArrayList<>();
        LocalDate enrollmentDay = e.getEnrollmentDate().atZone(ZONE).toLocalDate();

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
