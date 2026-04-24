package com.imedba.modules.diplomasettlement;

import static org.assertj.core.api.Assertions.assertThat;

import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.diploma.entity.PartnerConfig;
import com.imedba.modules.diplomasettlement.entity.DiplomaSettlement;
import com.imedba.modules.diplomasettlement.entity.PartnerDistribution;
import com.imedba.modules.diplomasettlement.service.SettlementEngine;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Tests de la lógica pura del motor de liquidación. Orden fijo:
 * tax → secretaria + publicidad (fijos) → admin/universidad/imedba (% sobre remaining)
 * → partners (remanente) × pct cada socia.
 */
class SettlementEngineTests {

    @Test
    @DisplayName("tax se aplica sobre el total recaudado")
    void tax_applied_first() {
        Diploma d = diplomaWith(
                "10.00", "0", "0", "0", "0", "0", List.of());
        DiplomaSettlement s = SettlementEngine.compute(d, 2026, 4, new BigDecimal("1000.00"));

        assertThat(s.getTaxCommissionAmount()).isEqualByComparingTo("100.00");
        assertThat(s.getTotalCollected()).isEqualByComparingTo("1000.00");
    }

    @Test
    @DisplayName("montos fijos de secretaria y publicidad se restan antes de los porcentajes")
    void fixed_amounts_deducted_before_percentages() {
        Diploma d = diplomaWith(
                "0", "200.00", "100.00", "0", "0", "0", List.of());
        DiplomaSettlement s = SettlementEngine.compute(d, 2026, 4, new BigDecimal("1000.00"));

        assertThat(s.getSecretaryAmount()).isEqualByComparingTo("200.00");
        assertThat(s.getAdvertisingAmount()).isEqualByComparingTo("100.00");
        // remaining1 = 1000 - 0 - 200 - 100 = 700, todo queda en partners
        assertThat(s.getPartnersTotal()).isEqualByComparingTo("700.00");
    }

    @Test
    @DisplayName("admin/universidad/imedba se calculan sobre remaining1 (no sobre total)")
    void percentages_applied_on_remaining_after_fixed_deductions() {
        // total=1000, tax 10% = 100, secretaria=100, publicidad=50 → remaining1=750
        // admin 20% de 750 = 150, universidad 10% = 75, imedba 10% = 75
        // partners_total = 750 - 150 - 75 - 75 = 450
        Diploma d = diplomaWith(
                "10.00", "100.00", "50.00", "20.00", "10.00", "10.00", List.of());
        DiplomaSettlement s = SettlementEngine.compute(d, 2026, 4, new BigDecimal("1000.00"));

        assertThat(s.getTaxCommissionAmount()).isEqualByComparingTo("100.00");
        assertThat(s.getAdminAmount()).isEqualByComparingTo("150.00");
        assertThat(s.getUniversityAmount()).isEqualByComparingTo("75.00");
        assertThat(s.getImedbaAmount()).isEqualByComparingTo("75.00");
        assertThat(s.getPartnersTotal()).isEqualByComparingTo("450.00");
    }

    @Test
    @DisplayName("reparto entre socias: cada una recibe partners_total × pct/100")
    void partners_split_according_to_pct() {
        List<PartnerConfig> partners = List.of(
                new PartnerConfig("Socia A", new BigDecimal("60.00"), "a@ex.com"),
                new PartnerConfig("Socia B", new BigDecimal("40.00"), "b@ex.com"));
        Diploma d = diplomaWith("0", "0", "0", "0", "0", "0", partners);

        DiplomaSettlement s = SettlementEngine.compute(d, 2026, 4, new BigDecimal("1000.00"));

        // remaining1 = 1000, partners_total = 1000
        assertThat(s.getPartnersTotal()).isEqualByComparingTo("1000.00");
        List<PartnerDistribution> dist = s.getPartnersDistribution();
        assertThat(dist).hasSize(2);
        assertThat(dist.get(0).name()).isEqualTo("Socia A");
        assertThat(dist.get(0).amount()).isEqualByComparingTo("600.00");
        assertThat(dist.get(0).paid()).isFalse();
        assertThat(dist.get(1).name()).isEqualTo("Socia B");
        assertThat(dist.get(1).amount()).isEqualByComparingTo("400.00");
    }

    @Test
    @DisplayName("si los fijos superan al total, remaining1 queda en cero (no negativo)")
    void negative_remaining_clamped_to_zero() {
        // total=100, secretaria=500 → remaining1 debería ser -400, clamp a 0
        Diploma d = diplomaWith(
                "0", "500.00", "0", "50.00", "0", "0", List.of());

        DiplomaSettlement s = SettlementEngine.compute(d, 2026, 4, new BigDecimal("100.00"));

        assertThat(s.getSecretaryAmount()).isEqualByComparingTo("500.00");
        assertThat(s.getAdminAmount()).isEqualByComparingTo("0.00");
        assertThat(s.getPartnersTotal()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("null o cero en total devuelve todas las líneas en cero")
    void zero_total_produces_zero_lines() {
        Diploma d = diplomaWith(
                "10.00", "100.00", "50.00", "20.00", "10.00", "10.00", List.of());

        DiplomaSettlement s = SettlementEngine.compute(d, 2026, 4, null);

        assertThat(s.getTotalCollected()).isEqualByComparingTo("0");
        assertThat(s.getTaxCommissionAmount()).isEqualByComparingTo("0.00");
        assertThat(s.getPartnersTotal()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("el remanente por redondeo queda absorbido en partners_total")
    void rounding_remainder_stays_in_partners_total() {
        // total=1000, admin=33.33%, universidad=33.33%, imedba=33.33%
        // cada uno sobre 1000 = 333.33 (HALF_UP). Suma = 999.99 → partners_total = 0.01
        Diploma d = diplomaWith(
                "0", "0", "0", "33.33", "33.33", "33.33", List.of());
        DiplomaSettlement s = SettlementEngine.compute(d, 2026, 4, new BigDecimal("1000.00"));

        assertThat(s.getAdminAmount()).isEqualByComparingTo("333.30");
        assertThat(s.getUniversityAmount()).isEqualByComparingTo("333.30");
        assertThat(s.getImedbaAmount()).isEqualByComparingTo("333.30");
        // 1000 - 333.30*3 = 1000 - 999.90 = 0.10
        assertThat(s.getPartnersTotal()).isEqualByComparingTo("0.10");
    }

    private static Diploma diplomaWith(
            String taxPct, String secretary, String advertising,
            String adminPct, String universityPct, String imedbaPct,
            List<PartnerConfig> partners) {
        return Diploma.builder()
                .name("Test Diploma")
                .taxCommissionPct(new BigDecimal(taxPct))
                .secretarySalary(new BigDecimal(secretary))
                .advertisingAmount(new BigDecimal(advertising))
                .adminPct(new BigDecimal(adminPct))
                .universityPct(new BigDecimal(universityPct))
                .imedbaPct(new BigDecimal(imedbaPct))
                .partnersConfig(partners)
                .build();
    }
}
