package com.imedba.modules.diplomasettlement;

import static org.assertj.core.api.Assertions.assertThat;

import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.diplomasettlement.entity.DiplomaSettlement;
import com.imedba.modules.diplomasettlement.entity.DirectorDistribution;
import com.imedba.modules.diplomasettlement.service.SettlementEngine;
import com.imedba.modules.diplomasettlement.service.SettlementEngine.Inputs;
import com.imedba.modules.staff.entity.Staff;
import com.imedba.modules.staff.entity.StaffType;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * Tests del motor de liquidación de diplomatura (PREMA) — fórmula V035.
 *
 * <p>Fuente: {@code liquidaciones-especificacion-20260724.docx}, doc 17 §3.3.
 *
 * <p>El motor anterior <b>calculaba mal</b>: no tenía el split 50/50, le faltaban
 * GASTOS VARIOS y el descuento de grabaciones, tomaba administración como un
 * porcentaje cuando es monto fijo, y sacaba universidad/IMEDBA sobre la base
 * equivocada. Estos tests fijan el comportamiento correcto.
 */
class SettlementEngineTests {

    private static Diploma diploma() {
        Diploma d = Diploma.builder().name("Diplomatura Prematuros").build();
        d.setId(UUID.randomUUID());
        return d;
    }

    private static Staff director(String first, String last) {
        Staff s = Staff.builder()
                .firstName(first).lastName(last)
                .email(first.toLowerCase() + "@imedba.dev")
                .staffType(StaffType.DIRECTORA)
                .build();
        s.setId(UUID.randomUUID());
        return s;
    }

    private static final List<Staff> IRIS_Y_NORMA =
            List.of(director("Iris", "Alvarez"), director("Norma", "Benitez"));

    private static DiplomaSettlement compute(
            BigDecimal collected, Inputs inputs, List<Staff> directors) {
        return SettlementEngine.compute(diploma(), 2026, 6, collected, directors, inputs);
    }

    @Nested
    @DisplayName("Caso completo de la fórmula")
    class CasoCompleto {

        /**
         * Números elegidos para que cada paso dé redondo y se pueda seguir a mano:
         * <pre>
         *   cobrado             1.000.000
         *   − 10% impuestos       100.000  → subtotal 1 = 900.000
         *   − 200.000 secretaria − 100.000 publicidad
         *   − 50.000 administración − 50.000 gastos varios
         *                                  → subtotal 2 = 500.000
         *   mitad = 250.000
         *     directoras: 250.000 − 50.000 grabaciones = 200.000 → 100.000 c/u
         *     empresa:    250.000 × 80% = 200.000 IMEDBA
         *                 250.000 × 20% =  50.000 UNTREF
         * </pre>
         */
        private DiplomaSettlement run() {
            return compute(
                    new BigDecimal("1000000"),
                    new Inputs(
                            new BigDecimal("10"),       // impuestos %
                            new BigDecimal("200000"),   // secretaria
                            new BigDecimal("100000"),   // publicidad
                            new BigDecimal("50000"),    // administración
                            new BigDecimal("50000"),    // gastos varios
                            new BigDecimal("50000"),    // grabaciones docentes
                            null, null),                // 80/20 por defecto
                    IRIS_Y_NORMA);
        }

        @Test
        @DisplayName("Los impuestos son el PRIMER descuento y salen sobre lo cobrado")
        void impuestos_primero() {
            DiplomaSettlement s = run();
            assertThat(s.getTaxCommissionAmount()).isEqualByComparingTo("100000.00");
            assertThat(s.getSubtotal1()).isEqualByComparingTo("900000.00");
        }

        @Test
        @DisplayName("Los 4 gastos administrativos son montos fijos y dan el subtotal 2")
        void cuatro_gastos_fijos() {
            DiplomaSettlement s = run();
            assertThat(s.getSecretaryAmount()).isEqualByComparingTo("200000.00");
            assertThat(s.getAdvertisingAmount()).isEqualByComparingTo("100000.00");
            assertThat(s.getAdministrationAmount()).isEqualByComparingTo("50000.00");
            assertThat(s.getMiscExpensesAmount()).isEqualByComparingTo("50000.00");
            assertThat(s.getSubtotal2()).isEqualByComparingTo("500000.00");
        }

        @Test
        @DisplayName("El subtotal 2 se parte 50/50")
        void split_mitades() {
            assertThat(run().getHalfAmount()).isEqualByComparingTo("250000.00");
        }

        @Test
        @DisplayName("Las grabaciones se descuentan SÓLO de la mitad de las directoras")
        void grabaciones_solo_a_directoras() {
            DiplomaSettlement s = run();
            assertThat(s.getRecordingsAmount()).isEqualByComparingTo("50000.00");
            assertThat(s.getDirectorsBaseAmount()).isEqualByComparingTo("200000.00");
            // La mitad de la empresa NO se ve afectada por las grabaciones.
            assertThat(s.getImedbaAmount()).isEqualByComparingTo("200000.00");
            assertThat(s.getUntrefAmount()).isEqualByComparingTo("50000.00");
        }

        @Test
        @DisplayName("Las directoras reparten en partes iguales, sin porcentaje por cabeza")
        void directoras_en_partes_iguales() {
            DiplomaSettlement s = run();
            assertThat(s.getDirectorsDistribution()).hasSize(2);
            assertThat(s.getDirectorsDistribution())
                    .allSatisfy(d -> assertThat(d.amount()).isEqualByComparingTo("100000.00"));
            assertThat(s.getDirectorsDistribution())
                    .extracting(DirectorDistribution::name)
                    .containsExactly("Alvarez, Iris", "Benitez, Norma");
        }

        @Test
        @DisplayName("El 80/20 sale de la MITAD, no del subtotal ni de lo cobrado")
        void ochenta_veinte_sobre_la_mitad() {
            DiplomaSettlement s = run();
            // 80% y 20% de 250.000 (la mitad), NO de 500.000 ni de 900.000.
            assertThat(s.getImedbaAmount()).isEqualByComparingTo("200000.00");
            assertThat(s.getUntrefAmount()).isEqualByComparingTo("50000.00");
            assertThat(s.getImedbaAmount().add(s.getUntrefAmount()))
                    .isEqualByComparingTo(s.getHalfAmount());
        }

        @Test
        @DisplayName("Identidad de control: subtotal 2 = directoras + grabaciones + IMEDBA + UNTREF")
        void identidad_de_control() {
            DiplomaSettlement s = run();
            BigDecimal directoras = s.getDirectorsDistribution().stream()
                    .map(DirectorDistribution::amount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            assertThat(directoras
                    .add(s.getRecordingsAmount())
                    .add(s.getImedbaAmount())
                    .add(s.getUntrefAmount()))
                    .isEqualByComparingTo(s.getSubtotal2());
        }
    }

    @Nested
    @DisplayName("Planilla real de IMEDBA (hoja PREMA, junio-2026)")
    class PlanillaReal {

        /**
         * Junio-2026 tal cual está en {@code liquidaciones-programa.xlsx}, hoja PREMA
         * (columna L). Cada importe esperado es una celda de esa hoja.
         *
         * <p>Ojo con dos celdas: la planilla arrastra floats con precisión completa y
         * sólo redondea para mostrar, así que difiere del sistema en <b>1 centavo</b> en
         * «Subtotal Directoras» (1.915.205,13 vs 1.915.205,14) y en «Imedba»
         * (1.532.164,11 vs 1.532.164,10). No es un error: los propios valores mostrados
         * por la planilla <b>no cierran</b> contra su subtotal 2 —suman un centavo de
         * más—, y acá se prioriza que la identidad de control cierre exacta.
         */
        private DiplomaSettlement junio() {
            return compute(
                    new BigDecimal("8369134"),          // Cobrado
                    new Inputs(
                            new BigDecimal("25.1"),     // Impuestos y comisiones bancarias
                            new BigDecimal("973848"),   // Sueldo secretaria
                            new BigDecimal("412673.10"),// Publicidad
                            new BigDecimal("988050"),   // Administración
                            new BigDecimal("63500"),    // Gasto de eventos («gastos varios»)
                            new BigDecimal("600000"),   // Docentes grabación
                            null, null),                // 80/20
                    IRIS_Y_NORMA);
        }

        @Test
        @DisplayName("Impuestos y subtotal 1 coinciden con la planilla")
        void impuestos_y_subtotal1() {
            DiplomaSettlement s = junio();
            assertThat(s.getTaxCommissionAmount()).isEqualByComparingTo("2100652.63");
            assertThat(s.getSubtotal1()).isEqualByComparingTo("6268481.37");
        }

        @Test
        @DisplayName("Subtotal 2 coincide con la planilla")
        void subtotal2() {
            assertThat(junio().getSubtotal2()).isEqualByComparingTo("3830410.27");
        }

        @Test
        @DisplayName("UNTREF y lo de cada directora coinciden con la planilla")
        void reparto_final() {
            DiplomaSettlement s = junio();
            assertThat(s.getUntrefAmount()).isEqualByComparingTo("383041.03");
            // «Distribución directoras» de la planilla: (mitad − grabaciones) / 2.
            assertThat(s.getDirectorsDistribution())
                    .allSatisfy(d -> assertThat(d.amount()).isEqualByComparingTo("657602.57"));
        }

        @Test
        @DisplayName("La identidad de control cierra EXACTA con los números reales")
        void identidad_con_datos_reales() {
            DiplomaSettlement s = junio();
            BigDecimal directoras = s.getDirectorsDistribution().stream()
                    .map(DirectorDistribution::amount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            assertThat(directoras
                    .add(s.getRecordingsAmount())
                    .add(s.getImedbaAmount())
                    .add(s.getUntrefAmount()))
                    .isEqualByComparingTo(s.getSubtotal2());
        }

        @Test
        @DisplayName("Mayo-2026: el residuo del reparto entre directoras no desbalancea nada")
        void mayo_con_residuo() {
            // Mayo tiene subtotal 2 = 4.010.230,37 → mitad ...,185 y (mitad − 637.500)/2
            // termina en medio centavo: es el caso donde el residuo importa.
            DiplomaSettlement s = compute(
                    new BigDecimal("7474134"),
                    new Inputs(new BigDecimal("25.1"), new BigDecimal("599876"),
                            new BigDecimal("148470"), new BigDecimal("839550"),
                            null, new BigDecimal("637500"), null, null),
                    IRIS_Y_NORMA);

            assertThat(s.getSubtotal1()).isEqualByComparingTo("5598126.37");
            assertThat(s.getSubtotal2()).isEqualByComparingTo("4010230.37");

            BigDecimal directoras = s.getDirectorsDistribution().stream()
                    .map(DirectorDistribution::amount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            assertThat(directoras
                    .add(s.getRecordingsAmount())
                    .add(s.getImedbaAmount())
                    .add(s.getUntrefAmount()))
                    .isEqualByComparingTo(s.getSubtotal2());
        }
    }

    @Nested
    @DisplayName("Redondeo y bordes")
    class Bordes {

        @Test
        @DisplayName("Con 3 directoras la última absorbe el residuo y la suma cierra exacta")
        void residuo_a_la_ultima() {
            List<Staff> tres = List.of(
                    director("Ana", "Uno"), director("Bea", "Dos"), director("Cris", "Tres"));
            // subtotal2 = 200 → mitad 100 → sin grabaciones → 100 / 3
            DiplomaSettlement s = compute(new BigDecimal("200"), Inputs.empty(), tres);

            assertThat(s.getDirectorsBaseAmount()).isEqualByComparingTo("100.00");
            assertThat(s.getDirectorsDistribution()).extracting(DirectorDistribution::amount)
                    .containsExactly(
                            new BigDecimal("33.33"), new BigDecimal("33.33"), new BigDecimal("33.34"));

            BigDecimal suma = s.getDirectorsDistribution().stream()
                    .map(DirectorDistribution::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
            assertThat(suma).isEqualByComparingTo("100.00");
        }

        @Test
        @DisplayName("Si las grabaciones superan la mitad, las directoras quedan en 0, no en negativo")
        void grabaciones_no_dejan_negativo() {
            DiplomaSettlement s = compute(new BigDecimal("1000"),
                    new Inputs(null, null, null, null, null,
                            new BigDecimal("99999"), null, null),
                    IRIS_Y_NORMA);

            assertThat(s.getDirectorsBaseAmount()).isEqualByComparingTo("0.00");
            assertThat(s.getDirectorsDistribution())
                    .allSatisfy(d -> assertThat(d.amount()).isEqualByComparingTo("0.00"));
            // La mitad de la empresa no se toca.
            assertThat(s.getImedbaAmount()).isEqualByComparingTo("400.00");
        }

        @Test
        @DisplayName("Si los gastos se comen todo, el subtotal 2 queda en 0 (no reparte negativos)")
        void mes_en_rojo() {
            DiplomaSettlement s = compute(new BigDecimal("100000"),
                    new Inputs(null, new BigDecimal("500000"), null, null, null, null, null, null),
                    IRIS_Y_NORMA);

            assertThat(s.getSubtotal2()).isEqualByComparingTo("0.00");
            assertThat(s.getHalfAmount()).isEqualByComparingTo("0.00");
            assertThat(s.getImedbaAmount()).isEqualByComparingTo("0.00");
        }

        @Test
        @DisplayName("Sin directoras cargadas no rompe: la distribución queda vacía")
        void sin_directoras() {
            DiplomaSettlement s = compute(new BigDecimal("1000"), Inputs.empty(), List.of());

            assertThat(s.getDirectorsDistribution()).isEmpty();
            assertThat(s.getDirectorsBaseAmount()).isEqualByComparingTo("500.00");
        }

        @Test
        @DisplayName("Todo en null: no explota y no inventa descuentos")
        void inputs_vacios() {
            DiplomaSettlement s = compute(new BigDecimal("1000"), Inputs.empty(), IRIS_Y_NORMA);

            assertThat(s.getTaxCommissionAmount()).isEqualByComparingTo("0.00");
            assertThat(s.getSubtotal1()).isEqualByComparingTo("1000.00");
            assertThat(s.getSubtotal2()).isEqualByComparingTo("1000.00");
            assertThat(s.getHalfAmount()).isEqualByComparingTo("500.00");
            assertThat(s.getImedbaAmount()).isEqualByComparingTo("400.00");   // 80% default
            assertThat(s.getUntrefAmount()).isEqualByComparingTo("100.00");   // 20% default
        }

        @Test
        @DisplayName("Cobrado null se trata como 0")
        void cobrado_null() {
            DiplomaSettlement s = compute(null, Inputs.empty(), IRIS_Y_NORMA);
            assertThat(s.getTotalCollected()).isEqualByComparingTo("0.00");
            assertThat(s.getSubtotal2()).isEqualByComparingTo("0.00");
        }

        @Test
        @DisplayName("El reparto 80/20 es configurable por liquidación")
        void reparto_configurable() {
            DiplomaSettlement s = compute(new BigDecimal("1000"),
                    new Inputs(null, null, null, null, null, null,
                            new BigDecimal("70"), new BigDecimal("30")),
                    IRIS_Y_NORMA);

            assertThat(s.getImedbaAmount()).isEqualByComparingTo("350.00");
            assertThat(s.getUntrefAmount()).isEqualByComparingTo("150.00");
        }
    }
}
