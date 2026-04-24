package com.imedba.modules.installment;

import static org.assertj.core.api.Assertions.assertThat;

import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import com.imedba.modules.installment.service.InstallmentGenerator;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Tests unitarios del generador de cronograma de cuotas. No requiere Spring ni DB.
 */
class InstallmentGeneratorTests {

    private static final ZoneId ART = ZoneId.of("America/Argentina/Buenos_Aires");

    @Test
    @DisplayName("Sin matrícula: divide financiedTotal en N cuotas iguales")
    void generates_n_equal_installments_when_no_fee() {
        Enrollment e = enrollment(null, new BigDecimal("60000.00"), 6,
                LocalDate.of(2026, 3, 1));

        List<Installment> schedule = InstallmentGenerator.generate(e);

        assertThat(schedule).hasSize(6);
        assertThat(schedule).allSatisfy(i -> assertThat(i.getStatus()).isEqualTo(InstallmentStatus.PENDING));
        assertThat(schedule).allSatisfy(i -> assertThat(i.getSurchargeAmount()).isEqualByComparingTo("0"));
        assertThat(schedule.stream().map(Installment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add))
                .isEqualByComparingTo("60000.00");
        assertThat(schedule.get(0).getNumber()).isEqualTo(1);
        assertThat(schedule.get(5).getNumber()).isEqualTo(6);
    }

    @Test
    @DisplayName("Con matrícula > 0: se crea cuota 0 y resto se cuotiza")
    void creates_enrollment_fee_installment_at_number_zero() {
        Enrollment e = enrollment(new BigDecimal("10000.00"), new BigDecimal("70000.00"), 6,
                LocalDate.of(2026, 3, 1));

        List<Installment> schedule = InstallmentGenerator.generate(e);

        assertThat(schedule).hasSize(7);
        Installment fee = schedule.get(0);
        assertThat(fee.getNumber()).isZero();
        assertThat(fee.getAmount()).isEqualByComparingTo("10000.00");
        assertThat(fee.getDueDate()).isEqualTo(LocalDate.of(2026, 3, 1));
        assertThat(schedule.stream().skip(1).map(Installment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add))
                .isEqualByComparingTo("60000.00");
    }

    @Test
    @DisplayName("Redondeo: última cuota absorbe el resto para que la suma sea exacta")
    void last_installment_absorbs_rounding_remainder() {
        Enrollment e = enrollment(null, new BigDecimal("100.00"), 3,
                LocalDate.of(2026, 3, 1));

        List<Installment> schedule = InstallmentGenerator.generate(e);

        assertThat(schedule).hasSize(3);
        assertThat(schedule.get(0).getAmount()).isEqualByComparingTo("33.33");
        assertThat(schedule.get(1).getAmount()).isEqualByComparingTo("33.33");
        assertThat(schedule.get(2).getAmount()).isEqualByComparingTo("33.34");
    }

    @Test
    @DisplayName("Fechas: primera cuota vence día 10 del mes o del siguiente si ya pasó")
    void first_due_date_is_day_ten_or_next_month() {
        Enrollment early = enrollment(null, new BigDecimal("12000"), 3, LocalDate.of(2026, 3, 5));
        Enrollment late  = enrollment(null, new BigDecimal("12000"), 3, LocalDate.of(2026, 3, 15));

        assertThat(InstallmentGenerator.generate(early).get(0).getDueDate())
                .isEqualTo(LocalDate.of(2026, 3, 10));
        assertThat(InstallmentGenerator.generate(late).get(0).getDueDate())
                .isEqualTo(LocalDate.of(2026, 4, 10));
    }

    @Test
    @DisplayName("Si finalPrice == enrollmentFee, no se generan cuotas adicionales")
    void no_installments_when_financed_total_is_zero() {
        Enrollment e = enrollment(new BigDecimal("50000"), new BigDecimal("50000"), 6,
                LocalDate.of(2026, 3, 1));

        List<Installment> schedule = InstallmentGenerator.generate(e);

        assertThat(schedule).hasSize(1);
        assertThat(schedule.get(0).getNumber()).isZero();
    }

    private static Enrollment enrollment(
            BigDecimal fee, BigDecimal finalPrice, int n, LocalDate enrolledOn) {
        Enrollment e = new Enrollment();
        e.setEnrollmentFee(fee);
        e.setFinalPrice(finalPrice);
        e.setNumInstallments(n);
        e.setEnrollmentDate(enrolledOn.atStartOfDay(ART).toInstant());
        return e;
    }

    @SuppressWarnings("unused")
    private static Instant noon(LocalDate d) {
        return d.atTime(12, 0).atZone(ART).toInstant();
    }
}
