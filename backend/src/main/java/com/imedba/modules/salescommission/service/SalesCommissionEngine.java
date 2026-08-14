package com.imedba.modules.salescommission.service;

import com.imedba.modules.salescommission.entity.CommissionSourceType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Motor de cálculo de comisiones de vendedora. Función pura: no toca DB ni Spring.
 *
 * <p>Fuente: {@code liquidaciones-especificacion-20260724.docx} + reunión 2026-07-24.
 * Fórmula <b>verificada al centavo</b> contra {@code liquidacion-comisiones-junio2026.csv}
 * (ver {@code instrucciones_claude/17-correcciones-y-liquidaciones-20260724.md} §3.1 y
 * {@code SalesCommissionEngineTests}).
 *
 * <p><b>Reglas</b>
 * <ol>
 *   <li>La base es lo <b>cobrado</b> en el período, no lo facturado. Una venta en 6 cuotas
 *       genera comisión en 6 meses distintos.</li>
 *   <li>Las ventas de curso se numeran dentro de su <b>mes de origen</b> por fecha de venta:
 *       las primeras {@code tierThreshold} (30) van a {@code tier1Rate} (0,5%), de la 31 en
 *       adelante a {@code tier2Rate} (1%).</li>
 *   <li>Esa alícuota queda <b>fijada</b> y se aplica a todas las cuotas futuras de esa venta,
 *       se cobren cuando se cobren. Por eso la planilla mantiene filas separadas de 0,5% y 1%
 *       a lo largo de todas las columnas de meses.</li>
 *   <li>Los libros sueltos y colecciones van siempre a {@code booksRate} (0,5%) y
 *       <b>no consumen</b> posición en el ranking.</li>
 * </ol>
 *
 * <p><b>Redondeo.</b> La comisión por línea se calcula exacta (multiplicación de
 * {@code BigDecimal}, sin pérdida) y se suma exacta. Se redondea <b>una sola vez</b>, sobre
 * el total. Los subtotales por bucket se redondean aparte y son sólo para mostrar: sumarlos
 * da 1 centavo de más contra la planilla real (186.793,51 vs 186.793,50).
 */
public final class SalesCommissionEngine {

    private SalesCommissionEngine() {}

    // ─── Parámetros ──────────────────────────────────────────────────────────

    public static final BigDecimal DEFAULT_TIER1_RATE = new BigDecimal("0.005");
    public static final BigDecimal DEFAULT_TIER2_RATE = new BigDecimal("0.010");
    public static final BigDecimal DEFAULT_BOOKS_RATE = new BigDecimal("0.005");
    public static final int DEFAULT_TIER_THRESHOLD = 30;

    /**
     * Alícuotas y umbral. Se snapshotean por liquidación: cambiar la política mañana
     * no debe reescribir lo ya emitido.
     *
     * @param tierThreshold cantidad de ventas que pagan {@code tier1Rate}. La venta
     *                      número {@code tierThreshold} paga tier1; la {@code +1} paga tier2
     *                      ("las primeras 30… a partir de la 31" — docx).
     */
    public record Params(
            BigDecimal tier1Rate,
            BigDecimal tier2Rate,
            BigDecimal booksRate,
            Integer tierThreshold) {

        public static Params defaults() {
            return new Params(DEFAULT_TIER1_RATE, DEFAULT_TIER2_RATE,
                    DEFAULT_BOOKS_RATE, DEFAULT_TIER_THRESHOLD);
        }

        /** Reemplaza cualquier campo NULL por el default. */
        public Params resolved() {
            return new Params(
                    tier1Rate      != null ? tier1Rate      : DEFAULT_TIER1_RATE,
                    tier2Rate      != null ? tier2Rate      : DEFAULT_TIER2_RATE,
                    booksRate      != null ? booksRate      : DEFAULT_BOOKS_RATE,
                    tierThreshold  != null ? tierThreshold  : DEFAULT_TIER_THRESHOLD);
        }
    }

    // ─── Entrada ─────────────────────────────────────────────────────────────

    /**
     * Una venta del vendedor, con cuánto se cobró de ella <b>dentro del período liquidado</b>.
     *
     * <p>Se deben pasar también las ventas con {@code collectedInPeriod == 0}: no generan
     * línea, pero <b>ocupan lugar en el ranking</b> de su mes y por lo tanto corren la
     * alícuota de las que vienen después.
     */
    public record Sale(
            UUID sourceId,
            CommissionSourceType sourceType,
            LocalDate saleDate,
            String studentName,
            String productName,
            BigDecimal collectedInPeriod) {}

    // ─── Salida ──────────────────────────────────────────────────────────────

    public record ComputedLine(
            UUID sourceId,
            CommissionSourceType sourceType,
            LocalDate saleDate,
            String studentName,
            String productName,
            Integer saleMonthRank,
            BigDecimal rateApplied,
            BigDecimal collectedAmount,
            BigDecimal commissionAmount,
            boolean fromPriorPeriod) {}

    /**
     * Buckets espejo de la planilla, más el detalle línea por línea.
     * Los cuatro pares {@code *Base}/{@code *Commission} suman {@code totalCommission}
     * salvo por el centavo de redondeo (ver nota de clase).
     */
    public record Result(
            BigDecimal tier1Base, BigDecimal tier1Commission,
            BigDecimal tier2Base, BigDecimal tier2Commission,
            BigDecimal booksBase, BigDecimal booksCommission,
            BigDecimal priorMonthsBase, BigDecimal priorMonthsCommission,
            BigDecimal totalCommission,
            List<ComputedLine> lines) {}

    // ─── Cálculo ─────────────────────────────────────────────────────────────

    public static Result compute(YearMonth period, List<Sale> sales, Params params) {
        Params p = (params == null ? Params.defaults() : params).resolved();
        List<Sale> input = sales == null ? List.of() : sales;

        Map<UUID, Integer> ranks = rankByOriginMonth(input);

        List<ComputedLine> lines = new ArrayList<>();
        BigDecimal tier1Base = BigDecimal.ZERO, tier1Comm = BigDecimal.ZERO;
        BigDecimal tier2Base = BigDecimal.ZERO, tier2Comm = BigDecimal.ZERO;
        BigDecimal booksBase = BigDecimal.ZERO, booksComm = BigDecimal.ZERO;
        BigDecimal priorBase = BigDecimal.ZERO, priorComm = BigDecimal.ZERO;
        BigDecimal exactTotal = BigDecimal.ZERO;

        for (Sale s : input) {
            BigDecimal collected = s.collectedInPeriod();
            if (collected == null || collected.signum() <= 0) {
                continue; // no genera línea, pero ya consumió su lugar en el ranking
            }
            Integer rank = ranks.get(s.sourceId());
            BigDecimal rate = rateFor(s.sourceType(), rank, p);

            // Exacto: BigDecimal.multiply no pierde precisión. El redondeo va al final.
            BigDecimal commission = collected.multiply(rate);
            exactTotal = exactTotal.add(commission);

            boolean prior = !YearMonth.from(s.saleDate()).equals(period);
            if (prior) {
                priorBase = priorBase.add(collected);
                priorComm = priorComm.add(commission);
            } else if (!s.sourceType().consumesRank()) {
                booksBase = booksBase.add(collected);
                booksComm = booksComm.add(commission);
            } else if (rank != null && rank > p.tierThreshold()) {
                tier2Base = tier2Base.add(collected);
                tier2Comm = tier2Comm.add(commission);
            } else {
                tier1Base = tier1Base.add(collected);
                tier1Comm = tier1Comm.add(commission);
            }

            lines.add(new ComputedLine(
                    s.sourceId(), s.sourceType(), s.saleDate(),
                    s.studentName(), s.productName(),
                    rank, rate, money(collected), money(commission), prior));
        }

        return new Result(
                money(tier1Base), money(tier1Comm),
                money(tier2Base), money(tier2Comm),
                money(booksBase), money(booksComm),
                money(priorBase), money(priorComm),
                money(exactTotal),   // ← único redondeo del cálculo
                List.copyOf(lines));
    }

    public static Result compute(YearMonth period, List<Sale> sales) {
        return compute(period, sales, Params.defaults());
    }

    // ─── Internos ────────────────────────────────────────────────────────────

    /**
     * Numera las ventas de curso dentro de cada mes de origen: 1, 2, 3… por fecha de
     * venta ascendente. Desempate por {@code sourceId} para que el ranking sea estable
     * entre corridas (dos ventas del mismo día tienen que caer siempre en el mismo orden).
     *
     * <p>Los libros sueltos quedan fuera del mapa: no rankean.
     */
    private static Map<UUID, Integer> rankByOriginMonth(List<Sale> sales) {
        Map<YearMonth, List<Sale>> byMonth = new LinkedHashMap<>();
        for (Sale s : sales) {
            if (!s.sourceType().consumesRank()) continue;
            byMonth.computeIfAbsent(YearMonth.from(s.saleDate()), k -> new ArrayList<>()).add(s);
        }

        Comparator<Sale> order = Comparator
                .comparing(Sale::saleDate)
                .thenComparing(s -> s.sourceId().toString());

        Map<UUID, Integer> ranks = new LinkedHashMap<>();
        for (List<Sale> monthSales : byMonth.values()) {
            monthSales.sort(order);
            int rank = 1;
            for (Sale s : monthSales) {
                ranks.put(s.sourceId(), rank++);
            }
        }
        return ranks;
    }

    private static BigDecimal rateFor(CommissionSourceType type, Integer rank, Params p) {
        if (!type.consumesRank()) return p.booksRate();
        if (rank == null || rank <= p.tierThreshold()) return p.tier1Rate();
        return p.tier2Rate();
    }

    private static BigDecimal money(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v.setScale(2, RoundingMode.HALF_UP);
    }
}
