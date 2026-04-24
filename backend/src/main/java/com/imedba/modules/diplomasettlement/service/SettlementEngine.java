package com.imedba.modules.diplomasettlement.service;

import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.diploma.entity.PartnerConfig;
import com.imedba.modules.diplomasettlement.entity.DiplomaSettlement;
import com.imedba.modules.diplomasettlement.entity.PartnerDistribution;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Motor de liquidación mensual de diplomaturas.
 *
 * <p>Orden de aplicación (fijo, no configurable por ahora):
 * <ol>
 *   <li>Impuestos y comisiones: total × tax_commission_pct / 100</li>
 *   <li>Sueldo secretaria: monto fijo</li>
 *   <li>Publicidad: monto fijo</li>
 *   <li>remaining1 = total − impuestos − secretaria − publicidad</li>
 *   <li>Administración: remaining1 × admin_pct / 100</li>
 *   <li>Universidad: remaining1 × university_pct / 100</li>
 *   <li>IMEDBA: remaining1 × imedba_pct / 100</li>
 *   <li>Socias total: remaining1 − admin − universidad − imedba</li>
 *   <li>Reparto entre socias: socias_total × pct_socia / 100</li>
 * </ol>
 *
 * <p>Redondeo: HALF_UP a 2 decimales en cada paso. El remanente por error de
 * redondeo queda en partners_total (no se prorratea).
 */
public final class SettlementEngine {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private SettlementEngine() {}

    public static DiplomaSettlement compute(Diploma d, int year, int month, BigDecimal totalCollected) {
        BigDecimal total = totalCollected == null ? BigDecimal.ZERO
                : totalCollected.setScale(2, RoundingMode.HALF_UP);

        BigDecimal taxPct = safePct(d.getTaxCommissionPct());
        BigDecimal secretary = safeAmount(d.getSecretarySalary());
        BigDecimal advertising = safeAmount(d.getAdvertisingAmount());
        BigDecimal adminPct = safePct(d.getAdminPct());
        BigDecimal universityPct = safePct(d.getUniversityPct());
        BigDecimal imedbaPct = safePct(d.getImedbaPct());

        BigDecimal tax = applyPct(total, taxPct);
        BigDecimal remaining1 = total.subtract(tax).subtract(secretary).subtract(advertising);
        if (remaining1.signum() < 0) remaining1 = BigDecimal.ZERO;

        BigDecimal admin = applyPct(remaining1, adminPct);
        BigDecimal university = applyPct(remaining1, universityPct);
        BigDecimal imedba = applyPct(remaining1, imedbaPct);

        BigDecimal partnersTotal = remaining1.subtract(admin).subtract(university).subtract(imedba);
        if (partnersTotal.signum() < 0) partnersTotal = BigDecimal.ZERO;

        List<PartnerDistribution> dist = new ArrayList<>();
        List<PartnerConfig> partners = d.getPartnersConfig();
        if (partners != null) {
            for (PartnerConfig p : partners) {
                BigDecimal pct = p.pct() == null ? BigDecimal.ZERO : p.pct();
                BigDecimal amount = applyPct(partnersTotal, pct);
                dist.add(new PartnerDistribution(
                        p.name(), pct, amount, p.email(), Boolean.FALSE));
            }
        }

        return DiplomaSettlement.builder()
                .diploma(d)
                .periodMonth(month)
                .periodYear(year)
                .totalCollected(total)
                .taxCommissionAmount(tax)
                .secretaryAmount(secretary)
                .advertisingAmount(advertising)
                .adminAmount(admin)
                .universityAmount(university)
                .imedbaAmount(imedba)
                .partnersTotal(partnersTotal)
                .partnersDistribution(dist)
                .build();
    }

    private static BigDecimal safePct(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static BigDecimal safeAmount(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal applyPct(BigDecimal base, BigDecimal pct) {
        if (base == null || pct == null) return BigDecimal.ZERO;
        return base.multiply(pct).divide(HUNDRED, 2, RoundingMode.HALF_UP);
    }
}
