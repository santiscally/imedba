package com.imedba.modules.diplomasettlement.service;

import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.diplomasettlement.entity.DirectorDistribution;
import com.imedba.modules.diplomasettlement.entity.DiplomaSettlement;
import com.imedba.modules.staff.entity.Staff;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Motor de liquidación mensual de diplomaturas (PREMA).
 *
 * <p>Fuente: {@code liquidaciones-especificacion-20260724.docx} + reunión 2026-07-24
 * (16:10-17:18). Ver {@code instrucciones_claude/17-correcciones-y-liquidaciones-20260724.md}
 * §3.3.
 *
 * <p><b>Fórmula</b>
 * <pre>
 *   BASE        = total cobrado del mes
 *   impuestos   = BASE × pct_impuestos_y_gastos_bancarios      [%, PRIMER descuento]
 *   SUBTOTAL_1  = BASE − impuestos                              («verde»)
 *   SUBTOTAL_2  = SUBTOTAL_1 − SECRETARIA − PUBLICIDAD
 *                            − ADMINISTRACION − GASTOS_VARIOS   («naranja», 4 montos FIJOS)
 *   MITAD       = SUBTOTAL_2 / 2
 *
 *   rama directoras:  base_dir      = MITAD − grabaciones_docentes
 *                     por_directora = base_dir / n_directoras   (partes iguales)
 *   rama empresa:     ganancia_imedba  = MITAD × 80%
 *                     acumulado_untref = MITAD × 20%
 * </pre>
 *
 * <p><b>Identidad de control</b> (cierra siempre, al centavo):
 * <pre>
 *   SUBTOTAL_2 = Σ por_directora + grabaciones + ganancia_imedba + acumulado_untref
 * </pre>
 *
 * <p><b>Redondeo:</b> HALF_UP a 2 decimales. Los residuos de las dos divisiones
 * (el /2 y el /n_directoras) los absorbe la última directora — si se prorratearan
 * o se descartaran, la identidad de arriba dejaría de cerrar.
 *
 * <p><b>El acumulado de UNTREF no se paga mensualmente:</b> se acumula y se salda
 * al cerrar la comisión (reunión 19:42). Acá sólo se calcula y se registra.
 */
public final class SettlementEngine {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal TWO = new BigDecimal("2");

    /** Reparto por defecto de la mitad que no va a las directoras. */
    public static final BigDecimal DEFAULT_IMEDBA_PCT = new BigDecimal("80");
    public static final BigDecimal DEFAULT_UNTREF_PCT = new BigDecimal("20");

    private SettlementEngine() {}

    /**
     * Inputs de la liquidación. Todos se cargan al liquidar, no en la diplomatura
     * (decisión 2026-05-22 §2.6: «publicidad no es un porcentaje de nada, es lo que
     * se gastó ese mes»).
     *
     * @param taxPct               impuestos y gastos bancarios, en % sobre lo cobrado
     * @param secretaryAmount      sueldo secretaría — monto fijo
     * @param advertisingAmount    publicidad — monto fijo
     * @param administrationAmount administración de IMEDBA — monto fijo
     * @param miscExpensesAmount   gastos varios — monto fijo
     * @param recordingsAmount     grabaciones docentes — se descuenta SÓLO de la mitad
     *                             de las directoras
     * @param imedbaPct            % de la mitad no-directoras que queda como ganancia (default 80).
     *                             <b>Es el que manda:</b> a UNTREF le toca el resto de esa mitad,
     *                             calculado por resta, para que los dos sumen exacto.
     * @param untrefPct            % de UNTREF (default 20). Se guarda para mostrarlo y auditar;
     *                             el monto sale por resta. El form valida que los dos sumen 100.
     */
    public record Inputs(
            BigDecimal taxPct,
            BigDecimal secretaryAmount,
            BigDecimal advertisingAmount,
            BigDecimal administrationAmount,
            BigDecimal miscExpensesAmount,
            BigDecimal recordingsAmount,
            BigDecimal imedbaPct,
            BigDecimal untrefPct) {

        public static Inputs empty() {
            return new Inputs(null, null, null, null, null, null, null, null);
        }

        /** Los montos nulos valen 0; los porcentajes de reparto caen a 80/20. */
        public Inputs resolved() {
            return new Inputs(
                    zeroIfNull(taxPct),
                    zeroIfNull(secretaryAmount),
                    zeroIfNull(advertisingAmount),
                    zeroIfNull(administrationAmount),
                    zeroIfNull(miscExpensesAmount),
                    zeroIfNull(recordingsAmount),
                    imedbaPct != null ? imedbaPct : DEFAULT_IMEDBA_PCT,
                    untrefPct != null ? untrefPct : DEFAULT_UNTREF_PCT);
        }
    }

    public static DiplomaSettlement compute(
            Diploma diploma,
            int year,
            int month,
            BigDecimal totalCollected,
            List<Staff> directors,
            Inputs inputs) {

        BigDecimal base = money(totalCollected);
        Inputs in = (inputs == null ? Inputs.empty() : inputs).resolved();

        // (1) Impuestos y gastos bancarios — primer descuento, sobre lo cobrado.
        BigDecimal tax = pctOf(base, in.taxPct());
        BigDecimal subtotal1 = base.subtract(tax);

        // (2) Gastos administrativos — cuatro MONTOS FIJOS, no porcentajes.
        BigDecimal secretary      = money(in.secretaryAmount());
        BigDecimal advertising    = money(in.advertisingAmount());
        BigDecimal administration = money(in.administrationAmount());
        BigDecimal misc           = money(in.miscExpensesAmount());
        BigDecimal subtotal2 = subtotal1
                .subtract(secretary).subtract(advertising)
                .subtract(administration).subtract(misc);

        // (3) Split 50/50. Si el mes cerró en rojo no se inventa un reparto negativo.
        if (subtotal2.signum() < 0) subtotal2 = BigDecimal.ZERO;
        BigDecimal half = subtotal2.divide(TWO, 2, RoundingMode.HALF_UP);

        // La OTRA mitad se calcula por resta, no dividiendo de nuevo. Con un subtotal
        // impar en centavos (p.ej. 3.830.410,27) cada mitad da ...,135 y redondear las
        // dos por separado las hace sumar un centavo MÁS que el subtotal. Por resta,
        // las dos mitades suman siempre exacto.
        BigDecimal companyHalf = subtotal2.subtract(half);

        // Rama directoras: la mitad menos las grabaciones, en partes iguales.
        BigDecimal recordings = money(in.recordingsAmount());
        if (recordings.compareTo(half) > 0) recordings = half;   // no puede dejarlas en negativo
        BigDecimal directorsBase = half.subtract(recordings);

        // Rama empresa: 80/20 sobre la OTRA mitad (no sobre el subtotal).
        // UNTREF sale por resta para que IMEDBA + UNTREF dé exactamente esa mitad.
        BigDecimal imedba = pctOf(companyHalf, in.imedbaPct());
        BigDecimal untref = companyHalf.subtract(imedba);

        List<DirectorDistribution> distribution = splitEqually(directorsBase, directors);

        return DiplomaSettlement.builder()
                .diploma(diploma)
                .periodMonth(month)
                .periodYear(year)
                .totalCollected(base)
                // inputs (se guardan para poder reproducir el cálculo)
                .inputTaxCommissionPct(in.taxPct())
                .inputSecretarySalary(in.secretaryAmount())
                .inputAdvertisingAmount(in.advertisingAmount())
                .inputAdministrationAmount(in.administrationAmount())
                .inputMiscExpensesAmount(in.miscExpensesAmount())
                .inputRecordingsAmount(in.recordingsAmount())
                .inputImedbaPct(in.imedbaPct())
                .inputUntrefPct(in.untrefPct())
                // resultados, paso por paso
                .taxCommissionAmount(tax)
                .subtotal1(subtotal1)
                .secretaryAmount(secretary)
                .advertisingAmount(advertising)
                .administrationAmount(administration)
                .miscExpensesAmount(misc)
                .subtotal2(subtotal2)
                .halfAmount(half)
                .recordingsAmount(recordings)
                .directorsBaseAmount(directorsBase)
                .imedbaAmount(imedba)
                .untrefAmount(untref)
                .directorsDistribution(distribution)
                .build();
    }

    /**
     * Reparte {@code total} en partes iguales. La <b>última</b> directora absorbe el
     * residuo del redondeo: con 3 directoras y $100, sale 33,33 / 33,33 / 33,34 y la
     * suma vuelve a dar exactamente $100.
     */
    private static List<DirectorDistribution> splitEqually(BigDecimal total, List<Staff> directors) {
        List<DirectorDistribution> out = new ArrayList<>();
        if (directors == null || directors.isEmpty()) {
            return out;
        }
        int n = directors.size();
        BigDecimal each = total.divide(new BigDecimal(n), 2, RoundingMode.DOWN);
        BigDecimal assigned = each.multiply(new BigDecimal(n - 1));

        for (int i = 0; i < n; i++) {
            Staff d = directors.get(i);
            BigDecimal amount = (i == n - 1) ? total.subtract(assigned) : each;
            out.add(new DirectorDistribution(
                    d.getId(),
                    (d.getLastName() + ", " + d.getFirstName()).trim(),
                    d.getFirstName(),
                    d.getEmail(),
                    amount,
                    Boolean.FALSE));
        }
        return out;
    }

    private static BigDecimal pctOf(BigDecimal base, BigDecimal pct) {
        if (base == null || pct == null) return BigDecimal.ZERO;
        return base.multiply(pct).divide(HUNDRED, 2, RoundingMode.HALF_UP);
    }

    private static BigDecimal money(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal zeroIfNull(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
