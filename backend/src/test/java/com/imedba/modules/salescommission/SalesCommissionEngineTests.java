package com.imedba.modules.salescommission;

import static org.assertj.core.api.Assertions.assertThat;

import com.imedba.modules.salescommission.entity.CommissionSourceType;
import com.imedba.modules.salescommission.service.SalesCommissionEngine;
import com.imedba.modules.salescommission.service.SalesCommissionEngine.Params;
import com.imedba.modules.salescommission.service.SalesCommissionEngine.Result;
import com.imedba.modules.salescommission.service.SalesCommissionEngine.Sale;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * Tests de caracterización del motor de comisiones contra la planilla real de
 * junio-2026 ({@code instrucciones_claude/liquidacion-comisiones-junio2026.csv}).
 *
 * <p>Los importes esperados NO son inventados: son las celdas de esa planilla. Si
 * un cambio rompe estos tests, el cálculo dejó de coincidir con lo que IMEDBA
 * viene liquidando a mano.
 *
 * <p>Junio-2026: 34 ventas — 30 de curso (ranking 1..30, todas al 0,5%) y 4 de
 * libros/colección. Ninguna llegó a la 31, así que el tramo del 1% da cero.
 */
class SalesCommissionEngineTests {

    private static final YearMonth JUNIO = YearMonth.of(2026, 6);

    // ─────────────────────────────────────────────────────────────────────────
    // Fixture: la planilla de junio-2026, tal cual.
    // ─────────────────────────────────────────────────────────────────────────

    /** Cobros de una venta, mes a mes desde junio. */
    private record Venta(int dia, String alumno, String producto, long... cobrosDesdeJunio) {}

    private static final List<Venta> CURSOS_JUNIO = List.of(
            new Venta(3,  "Carolina De Freitas", "Curso Junio/Julio LIBRE",   1_526_297),
            new Venta(6,  "Salomé Noreña",       "Curso de Reválida",         1_066_847),
            new Venta(7,  "Nadia Lamas",         "Banco Choice",                374_000),
            new Venta(9,  "Victoria Magnano",    "Curso Junio/Julio LIBRE",     346_847, 216_960, 216_960, 216_960, 216_960, 216_960),
            new Venta(9,  "Valentino Caggiano",  "Curso Junio/Julio LIBRE",     305_897, 216_960, 216_960, 216_960, 216_960, 216_960),
            new Venta(9,  "Emanuel Lopez",       "Curso Junio/Julio LIBRE",     305_897, 216_960, 216_960, 216_960, 216_960, 216_960),
            new Venta(9,  "Alvaro Galliano",     "Curso Junio/Julio LIBRE",     305_897, 216_960, 216_960, 216_960, 216_960, 216_960),
            new Venta(9,  "Iván Bundovics",      "Curso Junio/Julio LIBRE",     305_897, 216_960, 216_960, 216_960, 216_960, 216_960),
            new Venta(9,  "Natali Martincevich", "Curso Junio/Julio LIBRE",     305_897, 216_960, 216_960, 216_960, 216_960, 216_960),
            new Venta(11, "Selena Gomez",        "Curso Junio/Julio VIVO",      346_847, 302_400, 302_400, 302_400, 302_400, 302_400),
            new Venta(12, "Ana Belén Villagra",  "Curso Junio/Julio LIBRE",   1_220_400),
            new Venta(16, "María Elena Brizuela","Diplomatura Prematuros",      240_000, 195_000, 195_000, 195_000, 195_000, 195_000, 195_000),
            new Venta(17, "Giuliana De Luca",    "Curso Córdoba VIVO",        1_606_847),
            new Venta(17, "Sol Miranda",         "Curso Abril/Mayo LIBRE",      100_000, 100_000, 100_000, 100_000, 100_000, 100_000),
            new Venta(17, "Angela Cabrejos",     "Curso de Reválida",         1_025_897),
            new Venta(22, "Franco Eraso",        "Curso Tucumán LIBRE",       1_271_847),
            new Venta(22, "Paloma Caro",         "Curso Córdoba VIVO",        1_480_847),
            new Venta(22, "Lourdes Soria",       "Curso Pregrado Cirugía",      228_420),
            new Venta(23, "Sol Tamara Martínez", "Curso Tucumán LIBRE",         450_000, 156_179, 156_179, 156_179, 156_179, 156_179),
            // La planilla tiene la letra «g» tipeada en la celda de agosto de esta
            // venta, así que a partir de agosto deja de sumar. Es un error de tipeo
            // de la planilla; se replica acá sólo para que los totales matcheen.
            new Venta(24, "Wilson Oyuela",       "Curso PUR",                   210_000, 210_000),
            new Venta(25, "Angela Strzyzowski",  "Curso Abril/Mayo LIBRE",      305_897, 240_000, 240_000, 240_000, 240_000, 240_000),
            new Venta(29, "Alessandra Fasano",   "Curso Córdoba LIBRE",         305_897, 210_000, 210_000, 210_000, 210_000, 210_000),
            new Venta(30, "Pilar Mussano",       "Curso Junio/Julio LIBRE",   1_702_847),
            new Venta(30, "Solana Critto",       "Curso Tucumán LIBRE",       1_271_847),
            new Venta(30, "Natali Solari",       "Curso Córdoba LIBRE",       1_396_847),
            new Venta(30, "Ana Paula Studer",    "Curso Junio/Julio LIBRE",   1_661_897),
            new Venta(30, "Paula Sofía Herrera", "Curso Junio/Julio LIBRE",   1_567_247),
            new Venta(30, "Felipe Quinodoz",     "Curso Junio/Julio LIBRE",   1_702_847),
            new Venta(30, "Constanza Spotti",    "Curso Junio/Julio LIBRE",   1_661_897),
            new Venta(30, "Rocio Gozzing",       "Curso Junio/Julio VIVO",      346_847, 336_000, 336_000, 336_000, 336_000, 336_000));

    private static final List<Venta> LIBROS_JUNIO = List.of(
            new Venta(18, "Joaquín Lana",     "Libro de Ginecología y Obstetricia", 66_420),
            new Venta(14, "Zaida Chalup",     "Libro de Medicina Interna Vol. I",   66_420),
            new Venta(3,  "Micaela Gonzalez", "Libro de Cirugía",                   66_420),
            new Venta(24, "Sara Cardona",     "Colección de libros tradicional",   305_897));

    /**
     * Arma las 34 ventas de junio con el cobro correspondiente a {@code periodo}.
     * Una venta que no cobra nada en ese mes igual se incluye con 0: no genera
     * línea pero ocupa su lugar en el ranking.
     */
    private static List<Sale> planillaJunio(YearMonth periodo) {
        int offset = (int) (periodo.getYear() * 12L + periodo.getMonthValue()
                - (JUNIO.getYear() * 12L + JUNIO.getMonthValue()));
        List<Sale> sales = new ArrayList<>();
        int seq = 0;
        for (Venta v : CURSOS_JUNIO) {
            sales.add(toSale(v, CommissionSourceType.ENROLLMENT, offset, ++seq));
        }
        for (Venta v : LIBROS_JUNIO) {
            sales.add(toSale(v, CommissionSourceType.BOOK_SALE, offset, ++seq));
        }
        return sales;
    }

    private static Sale toSale(Venta v, CommissionSourceType type, int offset, int seq) {
        long cobrado = (offset >= 0 && offset < v.cobrosDesdeJunio().length)
                ? v.cobrosDesdeJunio()[offset] : 0L;
        return new Sale(
                seqUuid(seq), type,
                LocalDate.of(2026, 6, v.dia()),
                v.alumno(), v.producto(),
                BigDecimal.valueOf(cobrado));
    }

    /** UUID determinístico y creciente: fija el desempate del ranking entre ventas del mismo día. */
    private static UUID seqUuid(int seq) {
        return UUID.fromString(String.format("00000000-0000-0000-0000-%012d", seq));
    }

    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Planilla de junio-2026")
    class PlanillaJunio {

        @Test
        @DisplayName("Junio: 0,5% sobre 24.948.651 de cursos = $124.743,26 (celda de la planilla)")
        void tramo_bajo_de_junio() {
            Result r = SalesCommissionEngine.compute(JUNIO, planillaJunio(JUNIO));

            assertThat(r.tier1Base()).isEqualByComparingTo("24948651.00");
            assertThat(r.tier1Commission()).isEqualByComparingTo("124743.26");
        }

        @Test
        @DisplayName("Junio: no hubo venta 31, así que el tramo del 1% da cero")
        void tramo_alto_vacio_en_junio() {
            Result r = SalesCommissionEngine.compute(JUNIO, planillaJunio(JUNIO));

            assertThat(r.tier2Base()).isEqualByComparingTo("0");
            assertThat(r.tier2Commission()).isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("Junio: libros y colección al 0,5% sobre 505.157 = $2.525,79")
        void libros_de_junio() {
            Result r = SalesCommissionEngine.compute(JUNIO, planillaJunio(JUNIO));

            assertThat(r.booksBase()).isEqualByComparingTo("505157.00");
            assertThat(r.booksCommission()).isEqualByComparingTo("2525.79");
        }

        @Test
        @DisplayName("Junio: total de la cohorte = $127.269,04")
        void total_de_la_cohorte_de_junio() {
            Result r = SalesCommissionEngine.compute(JUNIO, planillaJunio(JUNIO));

            // La planilla suma además $59.524,46 de «comisiones mes anterior», que
            // sale de las cohortes de mayo y previas (no están en este archivo).
            // 124.743,26 + 2.525,79 + 59.524,46 = 186.793,50 (el TOTAL de la planilla).
            assertThat(r.totalCommission()).isEqualByComparingTo("127269.04");
            assertThat(r.priorMonthsCommission()).isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("Las 34 ventas de junio generan 34 líneas de detalle")
        void detalle_completo() {
            Result r = SalesCommissionEngine.compute(JUNIO, planillaJunio(JUNIO));

            assertThat(r.lines()).hasSize(34);
            assertThat(r.lines()).filteredOn(l -> l.sourceType() == CommissionSourceType.BOOK_SALE)
                    .hasSize(4)
                    .allSatisfy(l -> {
                        assertThat(l.saleMonthRank()).isNull();
                        assertThat(l.rateApplied()).isEqualByComparingTo("0.005");
                    });
        }
    }

    @Nested
    @DisplayName("Proyección de las cuotas de la cohorte de junio")
    class Proyeccion {

        @Test
        @DisplayName("Julio a diciembre: los 6 importes proyectados por la planilla")
        void cuotas_futuras() {
            record Esperado(YearMonth mes, String base, String comision) {}
            List<Esperado> esperados = List.of(
                    new Esperado(YearMonth.of(2026, 7),  "3051339.00", "15256.70"),
                    new Esperado(YearMonth.of(2026, 8),  "2841339.00", "14206.70"),
                    new Esperado(YearMonth.of(2026, 9),  "2841339.00", "14206.70"),
                    new Esperado(YearMonth.of(2026, 10), "2841339.00", "14206.70"),
                    new Esperado(YearMonth.of(2026, 11), "2841339.00", "14206.70"),
                    new Esperado(YearMonth.of(2026, 12),  "195000.00",   "975.00"));

            for (Esperado e : esperados) {
                Result r = SalesCommissionEngine.compute(e.mes(), planillaJunio(e.mes()));

                assertThat(r.totalCommission())
                        .as("comisión total de %s", e.mes())
                        .isEqualByComparingTo(e.comision());
                assertThat(r.priorMonthsBase())
                        .as("base cobrada en %s", e.mes())
                        .isEqualByComparingTo(e.base());
            }
        }

        @Test
        @DisplayName("Cobradas en julio, las ventas de junio caen en «meses anteriores», no en el tramo del mes")
        void cohorte_previa_no_ensucia_los_buckets_del_mes() {
            YearMonth julio = YearMonth.of(2026, 7);

            Result r = SalesCommissionEngine.compute(julio, planillaJunio(julio));

            assertThat(r.tier1Commission()).isEqualByComparingTo("0");
            assertThat(r.tier2Commission()).isEqualByComparingTo("0");
            assertThat(r.booksCommission()).isEqualByComparingTo("0");
            assertThat(r.priorMonthsCommission()).isEqualByComparingTo("15256.70");
            assertThat(r.lines()).allMatch(SalesCommissionEngine.ComputedLine::fromPriorPeriod);
        }
    }

    @Nested
    @DisplayName("Ranking y alícuotas")
    class Ranking {

        @Test
        @DisplayName("La venta 30 paga 0,5% y la 31 paga 1% («las primeras 30… a partir de la 31»)")
        void borde_del_tramo() {
            List<Sale> sales = new ArrayList<>();
            for (int i = 1; i <= 31; i++) {
                sales.add(new Sale(seqUuid(i), CommissionSourceType.ENROLLMENT,
                        LocalDate.of(2026, 6, i <= 28 ? i : 28),
                        "Alumno " + i, "Curso", new BigDecimal("1000000")));
            }

            Result r = SalesCommissionEngine.compute(JUNIO, sales);

            assertThat(r.lines()).filteredOn(l -> l.saleMonthRank() == 30)
                    .singleElement()
                    .satisfies(l -> assertThat(l.rateApplied()).isEqualByComparingTo("0.005"));
            assertThat(r.lines()).filteredOn(l -> l.saleMonthRank() == 31)
                    .singleElement()
                    .satisfies(l -> assertThat(l.rateApplied()).isEqualByComparingTo("0.010"));
            // 30 ventas × 1.000.000 × 0,5%  +  1 venta × 1.000.000 × 1%
            assertThat(r.tier1Commission()).isEqualByComparingTo("150000.00");
            assertThat(r.tier2Commission()).isEqualByComparingTo("10000.00");
        }

        @Test
        @DisplayName("Los libros no consumen lugar en el ranking: intercalados, la venta 31 sigue siendo la 31")
        void libros_no_rankean() {
            List<Sale> sales = new ArrayList<>();
            for (int i = 1; i <= 31; i++) {
                sales.add(new Sale(seqUuid(i * 2), CommissionSourceType.ENROLLMENT,
                        LocalDate.of(2026, 6, Math.min(i, 28)),
                        "Alumno " + i, "Curso", new BigDecimal("1000000")));
                sales.add(new Sale(seqUuid(i * 2 + 1), CommissionSourceType.BOOK_SALE,
                        LocalDate.of(2026, 6, Math.min(i, 28)),
                        "Comprador " + i, "Libro", new BigDecimal("100000")));
            }

            Result r = SalesCommissionEngine.compute(JUNIO, sales);

            assertThat(r.tier2Base()).isEqualByComparingTo("1000000.00");   // sólo la venta 31
            assertThat(r.booksBase()).isEqualByComparingTo("3100000.00");   // 31 libros
            assertThat(r.booksCommission()).isEqualByComparingTo("15500.00");
        }

        @Test
        @DisplayName("La alícuota queda fijada por el mes de origen: la venta 31 de junio sigue al 1% cobrando en noviembre")
        void alicuota_fijada_por_la_cohorte() {
            List<Sale> junio = new ArrayList<>();
            for (int i = 1; i <= 31; i++) {
                // Sólo la venta 31 cobra algo en noviembre; el resto ya cobró todo antes.
                BigDecimal cobradoEnNoviembre = (i == 31) ? new BigDecimal("500000") : BigDecimal.ZERO;
                junio.add(new Sale(seqUuid(i), CommissionSourceType.ENROLLMENT,
                        LocalDate.of(2026, 6, Math.min(i, 28)),
                        "Alumno " + i, "Curso", cobradoEnNoviembre));
            }

            Result r = SalesCommissionEngine.compute(YearMonth.of(2026, 11), junio);

            assertThat(r.lines()).singleElement().satisfies(l -> {
                assertThat(l.saleMonthRank()).isEqualTo(31);
                assertThat(l.rateApplied()).isEqualByComparingTo("0.010");
            });
            assertThat(r.totalCommission()).isEqualByComparingTo("5000.00");
        }

        @Test
        @DisplayName("Una venta sin cobros en el período no genera línea pero igual ocupa su lugar")
        void venta_sin_cobro_igual_rankea() {
            List<Sale> sales = new ArrayList<>();
            for (int i = 1; i <= 30; i++) {
                sales.add(new Sale(seqUuid(i), CommissionSourceType.ENROLLMENT,
                        LocalDate.of(2026, 6, Math.min(i, 28)),
                        "Alumno " + i, "Curso", BigDecimal.ZERO));   // ninguna cobra
            }
            sales.add(new Sale(seqUuid(31), CommissionSourceType.ENROLLMENT,
                    LocalDate.of(2026, 6, 29), "Alumno 31", "Curso", new BigDecimal("1000000")));

            Result r = SalesCommissionEngine.compute(JUNIO, sales);

            assertThat(r.lines()).singleElement()
                    .satisfies(l -> assertThat(l.rateApplied()).isEqualByComparingTo("0.010"));
            assertThat(r.tier2Commission()).isEqualByComparingTo("10000.00");
        }

        @Test
        @DisplayName("Regresión: si el mes de origen llega incompleto, la venta 31 cobraría la alícuota baja")
        void mes_de_origen_incompleto_corrompe_el_ranking() {
            // Fija por qué `SalesCommissionService.gatherSales` arranca la ventana en el
            // PRIMER DÍA del mes de la venta más antigua que cobró, y no en la fecha exacta
            // de esa venta: si al motor le llega sólo la venta 31 de junio (sin sus 30
            // hermanas), la rankea 1ª y le aplica 0,5% en lugar de 1%.
            Sale sola = new Sale(seqUuid(31), CommissionSourceType.ENROLLMENT,
                    LocalDate.of(2026, 6, 29), "Alumno 31", "Curso", new BigDecimal("500000"));

            Result incompleto = SalesCommissionEngine.compute(YearMonth.of(2026, 11), List.of(sola));

            assertThat(incompleto.lines()).singleElement().satisfies(l -> {
                assertThat(l.saleMonthRank()).isEqualTo(1);                    // ← mal rankeada
                assertThat(l.rateApplied()).isEqualByComparingTo("0.005");     // ← alícuota equivocada
            });

            // Con el mes de origen completo, la misma venta rankea 31 y cobra 1%.
            List<Sale> completo = new ArrayList<>();
            for (int i = 1; i <= 30; i++) {
                completo.add(new Sale(seqUuid(i), CommissionSourceType.ENROLLMENT,
                        LocalDate.of(2026, 6, Math.min(i, 28)),
                        "Alumno " + i, "Curso", BigDecimal.ZERO));
            }
            completo.add(sola);

            Result r = SalesCommissionEngine.compute(YearMonth.of(2026, 11), completo);

            assertThat(r.lines()).singleElement().satisfies(l -> {
                assertThat(l.saleMonthRank()).isEqualTo(31);
                assertThat(l.rateApplied()).isEqualByComparingTo("0.010");
            });
            assertThat(r.totalCommission()).isEqualByComparingTo("5000.00");
        }
    }

    @Nested
    @DisplayName("Redondeo")
    class Redondeo {

        @Test
        @DisplayName("Se redondea una sola vez al final: sumar buckets ya redondeados daría 1 centavo de más")
        void redondeo_unico_al_final() {
            // Dos líneas de 0,5% que caen en medio centavo cada una:
            //   1.000.100 × 0,005 = 5000,50  → exacto
            //   1.000.101 × 0,005 = 5000,505 → redondeado sería 5000,51
            // Total exacto = 10001,005 → 10001,01 (HALF_UP sobre la suma).
            List<Sale> sales = List.of(
                    new Sale(seqUuid(1), CommissionSourceType.ENROLLMENT,
                            LocalDate.of(2026, 6, 1), "A", "Curso", new BigDecimal("1000100")),
                    new Sale(seqUuid(2), CommissionSourceType.BOOK_SALE,
                            LocalDate.of(2026, 6, 2), "B", "Libro", new BigDecimal("1000101")));

            Result r = SalesCommissionEngine.compute(JUNIO, sales);

            assertThat(r.tier1Commission()).isEqualByComparingTo("5000.50");
            assertThat(r.booksCommission()).isEqualByComparingTo("5000.51"); // display, redondeado
            assertThat(r.totalCommission()).isEqualByComparingTo("10001.01"); // NO 10001,02
        }
    }

    @Nested
    @DisplayName("Parámetros")
    class Parametros {

        @Test
        @DisplayName("Las alícuotas y el umbral son configurables; los nulls caen al default")
        void params_configurables() {
            List<Sale> sales = List.of(
                    new Sale(seqUuid(1), CommissionSourceType.ENROLLMENT,
                            LocalDate.of(2026, 6, 1), "A", "Curso", new BigDecimal("1000000")),
                    new Sale(seqUuid(2), CommissionSourceType.ENROLLMENT,
                            LocalDate.of(2026, 6, 2), "B", "Curso", new BigDecimal("1000000")));

            Result r = SalesCommissionEngine.compute(JUNIO, sales,
                    new Params(new BigDecimal("0.02"), null, null, 1));

            assertThat(r.tier1Commission()).isEqualByComparingTo("20000.00"); // 2% la primera
            assertThat(r.tier2Commission()).isEqualByComparingTo("10000.00"); // default 1% la segunda
        }

        @Test
        @DisplayName("Sin ventas devuelve todo en cero, no null")
        void sin_ventas() {
            Result r = SalesCommissionEngine.compute(JUNIO, List.of());

            assertThat(r.totalCommission()).isEqualByComparingTo("0");
            assertThat(r.lines()).isEmpty();
        }
    }
}
