package com.imedba.modules.installment;

import static org.assertj.core.api.Assertions.assertThat;

import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import com.imedba.modules.installment.service.InstallmentService;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Tests unitarios de la lógica pura de recargo/cobro. El servicio se construye
 * con dependencias null porque estos métodos (applySurcharge, markPaid) no las usan.
 */
class InstallmentSurchargeTests {

    private final InstallmentService service = new InstallmentService(null, null);

    @ParameterizedTest(name = "amount={0} → surcharge={1}")
    @CsvSource({
            "100.00, 5.00",
            "1234.56, 61.73",
            "999.99, 50.00",
            "0.01, 0.00"
    })
    @DisplayName("applySurcharge: 5% sobre amount, redondeo HALF_UP, status pasa a OVERDUE")
    void applies_five_percent(BigDecimal amount, BigDecimal expectedSurcharge) {
        Installment i = newPending(amount);

        service.applySurcharge(i);

        assertThat(i.getSurchargeAmount()).isEqualByComparingTo(expectedSurcharge);
        assertThat(i.getStatus()).isEqualTo(InstallmentStatus.OVERDUE);
    }

    @Test
    @DisplayName("applySurcharge es idempotente: no re-aplica si ya hay surcharge > 0")
    void idempotent_when_already_surcharged() {
        Installment i = newPending(new BigDecimal("1000.00"));
        service.applySurcharge(i);
        BigDecimal firstSurcharge = i.getSurchargeAmount();

        service.applySurcharge(i);

        assertThat(i.getSurchargeAmount()).isEqualByComparingTo(firstSurcharge);
    }

    @Test
    @DisplayName("applySurcharge no hace nada si la cuota está PAID")
    void noop_when_paid() {
        Installment i = newPending(new BigDecimal("1000.00"));
        i.setStatus(InstallmentStatus.PAID);

        service.applySurcharge(i);

        assertThat(i.getSurchargeAmount()).isEqualByComparingTo("0");
        assertThat(i.getStatus()).isEqualTo(InstallmentStatus.PAID);
    }

    @Test
    @DisplayName("markPaid setea status=PAID y paidAt")
    void mark_paid_sets_status_and_timestamp() {
        Installment i = newPending(new BigDecimal("500"));
        Instant now = Instant.parse("2026-05-12T10:00:00Z");

        service.markPaid(i, now);

        assertThat(i.getStatus()).isEqualTo(InstallmentStatus.PAID);
        assertThat(i.getPaidAt()).isEqualTo(now);
    }

    @Test
    @DisplayName("totalDue = amount + surcharge")
    void total_due_includes_surcharge() {
        Installment i = newPending(new BigDecimal("1000.00"));
        service.applySurcharge(i);

        assertThat(i.totalDue()).isEqualByComparingTo("1050.00");
    }

    private static Installment newPending(BigDecimal amount) {
        Installment i = new Installment();
        i.setAmount(amount);
        i.setSurchargeAmount(BigDecimal.ZERO);
        i.setStatus(InstallmentStatus.PENDING);
        return i;
    }
}
