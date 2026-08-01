package com.imedba.modules.teaching;

import static org.assertj.core.api.Assertions.assertThat;

import com.imedba.modules.teaching.entity.TeachingRole;
import com.imedba.modules.teaching.service.TeachingSettlementEngine;
import com.imedba.modules.teaching.service.TeachingSettlementEngine.Result;
import com.imedba.modules.teaching.service.TeachingSettlementEngine.SessionInput;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * Tests del motor de liquidación de horas docentes y de preceptoría (V037).
 *
 * <p>Fórmulas confirmadas por Nico el 2026-07-30 (doc 17 §3.2). Los datos de la
 * hoja «HS DOCENTE» de junio-2026 se usan como fixture donde aplica — con la
 * salvedad de que en esa planilla la columna «Cantidad de horas a pagar» está
 * vacía, así que los totales del mes todavía no existen del lado del cliente.
 */
class TeachingSettlementEngineTests {

    private static final BigDecimal RATE_DOCENTE = new BigDecimal("75000");
    private static final BigDecimal RATE_PRECEPTORA = new BigDecimal("6500");

    private static SessionInput clase(String fecha, String horas) {
        return new SessionInput(
                UUID.randomUUID(), LocalDate.parse(fecha),
                "COM 10", "PREMA", "Cierre de módulo",
                horas == null ? null : new BigDecimal(horas));
    }

    @Nested
    @DisplayName("Docente")
    class Docente {

        @Test
        @DisplayName("Total = horas × valor hora, sin ningún bonus")
        void formula_docente() {
            Result r = TeachingSettlementEngine.compute(
                    TeachingRole.DOCENTE, RATE_DOCENTE,
                    List.of(clase("2026-06-02", "2"), clase("2026-06-04", "2.5")));

            assertThat(r.classCount()).isEqualTo(2);
            assertThat(r.totalHours()).isEqualByComparingTo("4.50");
            // La docente NO cobra el cuarto de hora por clase: ese es el tiempo de
            // anticipación de la preceptora para abrir la clase.
            assertThat(r.bonusHours()).isEqualByComparingTo("0.00");
            assertThat(r.billableHours()).isEqualByComparingTo("4.50");
            assertThat(r.totalAmount()).isEqualByComparingTo("337500.00");
        }

        @Test
        @DisplayName("La media hora extra que duró la clase se paga")
        void media_hora_extra() {
            // El caso que menciona Nico: «decía que iba a ser de dos horas y duró
            // dos horas y media, para pagarle esa media hora».
            Result r = TeachingSettlementEngine.compute(
                    TeachingRole.DOCENTE, RATE_DOCENTE, List.of(clase("2026-06-01", "2.5")));

            assertThat(r.totalAmount()).isEqualByComparingTo("187500.00");
        }
    }

    @Nested
    @DisplayName("Preceptora — el 0,25 por clase")
    class Preceptora {

        @Test
        @DisplayName("Se SUMA un cuarto de hora por clase (opción A), no se recarga el total")
        void bonus_por_clase_no_porcentaje() {
            // 4 clases de 2 h — el caso que distingue las dos lecturas:
            //   (a) sumar 0,25 h por clase → 8 + 1 = 9 h    ← la correcta
            //   (b) recargar el total 25%  → 8 × 1,25 = 10 h
            List<SessionInput> cuatroClasesDeDos = List.of(
                    clase("2026-06-01", "2"), clase("2026-06-08", "2"),
                    clase("2026-06-15", "2"), clase("2026-06-22", "2"));

            Result r = TeachingSettlementEngine.compute(
                    TeachingRole.PRECEPTORA, RATE_PRECEPTORA, cuatroClasesDeDos);

            assertThat(r.totalHours()).isEqualByComparingTo("8.00");
            assertThat(r.bonusHours()).isEqualByComparingTo("1.00");     // 0,25 × 4
            assertThat(r.billableHours()).isEqualByComparingTo("9.00");  // NO 10
            assertThat(r.totalAmount()).isEqualByComparingTo("58500.00");

            // Prueba explícita de que NO es la lectura (b): con el recargo del 25%
            // el total sería 10 h × 6.500 = 65.000.
            assertThat(r.totalAmount()).isNotEqualByComparingTo("65000.00");
        }

        @Test
        @DisplayName("Con clases de 1 hora las dos lecturas coinciden — por eso no alcanzaba con un caso así")
        void clases_de_una_hora_no_distinguen() {
            List<SessionInput> cuatroClasesDeUna = List.of(
                    clase("2026-06-01", "1"), clase("2026-06-08", "1"),
                    clase("2026-06-15", "1"), clase("2026-06-22", "1"));

            Result r = TeachingSettlementEngine.compute(
                    TeachingRole.PRECEPTORA, RATE_PRECEPTORA, cuatroClasesDeUna);

            // 4 + 1 = 5 h, que es lo mismo que 4 × 1,25. Ambigüedad real.
            assertThat(r.billableHours()).isEqualByComparingTo("5.00");
        }

        @Test
        @DisplayName("El bonus escala con la cantidad de clases, no con las horas")
        void bonus_escala_con_clases() {
            // Una clase larga vs. varias cortas con las mismas horas totales:
            // la preceptora cobra más bonus cuantas más clases abra.
            Result unaLarga = TeachingSettlementEngine.compute(
                    TeachingRole.PRECEPTORA, RATE_PRECEPTORA, List.of(clase("2026-06-01", "8")));
            Result cuatroCortas = TeachingSettlementEngine.compute(
                    TeachingRole.PRECEPTORA, RATE_PRECEPTORA,
                    List.of(clase("2026-06-01", "2"), clase("2026-06-02", "2"),
                            clase("2026-06-03", "2"), clase("2026-06-04", "2")));

            assertThat(unaLarga.bonusHours()).isEqualByComparingTo("0.25");
            assertThat(cuatroCortas.bonusHours()).isEqualByComparingTo("1.00");
            assertThat(cuatroCortas.totalAmount())
                    .isGreaterThan(unaLarga.totalAmount());
        }

        @Test
        @DisplayName("Una clase sin horas cargadas igual cuenta para el bonus: la preceptora estuvo ahí")
        void clase_sin_horas_cuenta_para_bonus() {
            Result r = TeachingSettlementEngine.compute(
                    TeachingRole.PRECEPTORA, RATE_PRECEPTORA,
                    List.of(clase("2026-06-01", "2"), clase("2026-06-02", null)));

            assertThat(r.classCount()).isEqualTo(2);
            assertThat(r.totalHours()).isEqualByComparingTo("2.00");
            assertThat(r.bonusHours()).isEqualByComparingTo("0.50");   // 0,25 × 2
            assertThat(r.billableHours()).isEqualByComparingTo("2.50");
        }
    }

    @Nested
    @DisplayName("Bordes")
    class Bordes {

        @Test
        @DisplayName("Sin clases: todo en cero, no null")
        void sin_clases() {
            Result r = TeachingSettlementEngine.compute(
                    TeachingRole.DOCENTE, RATE_DOCENTE, List.of());

            assertThat(r.classCount()).isZero();
            assertThat(r.totalAmount()).isEqualByComparingTo("0.00");
            assertThat(r.lines()).isEmpty();
        }

        @Test
        @DisplayName("Lista null se trata como vacía")
        void lista_null() {
            Result r = TeachingSettlementEngine.compute(TeachingRole.DOCENTE, RATE_DOCENTE, null);
            assertThat(r.totalAmount()).isEqualByComparingTo("0.00");
        }

        @Test
        @DisplayName("Valor hora null se trata como 0 en vez de explotar")
        void rate_null() {
            Result r = TeachingSettlementEngine.compute(
                    TeachingRole.DOCENTE, null, List.of(clase("2026-06-01", "2")));

            assertThat(r.billableHours()).isEqualByComparingTo("2.00");
            assertThat(r.totalAmount()).isEqualByComparingTo("0.00");
        }

        @Test
        @DisplayName("Horas con fracción de minutos: 2h50 = 2,83 h")
        void fraccion_de_minutos() {
            // La planilla trae «2 h 50». En el sistema se carga como decimal:
            // 50 min = 0,83 h. Este test fija que no se pierde la fracción.
            Result r = TeachingSettlementEngine.compute(
                    TeachingRole.DOCENTE, RATE_DOCENTE, List.of(clase("2026-06-01", "2.83")));

            assertThat(r.billableHours()).isEqualByComparingTo("2.83");
            assertThat(r.totalAmount()).isEqualByComparingTo("212250.00");
        }

        @Test
        @DisplayName("El detalle conserva una línea por clase, con sus datos")
        void detalle_por_clase() {
            Result r = TeachingSettlementEngine.compute(
                    TeachingRole.PRECEPTORA, RATE_PRECEPTORA,
                    List.of(clase("2026-06-02", "2"), clase("2026-06-23", "2")));

            assertThat(r.lines()).hasSize(2);
            assertThat(r.lines().get(0).sessionDate()).isEqualTo(LocalDate.of(2026, 6, 2));
            assertThat(r.lines()).allSatisfy(l -> {
                assertThat(l.commission()).isEqualTo("COM 10");
                assertThat(l.hoursPaid()).isEqualByComparingTo("2.00");
            });
        }

        @Test
        @DisplayName("Muchas clases: el bonus no acumula error de redondeo")
        void muchas_clases() {
            List<SessionInput> treinta = new ArrayList<>();
            for (int i = 1; i <= 30; i++) {
                treinta.add(clase(String.format("2026-06-%02d", Math.min(i, 30)), "1.5"));
            }

            Result r = TeachingSettlementEngine.compute(
                    TeachingRole.PRECEPTORA, RATE_PRECEPTORA, treinta);

            assertThat(r.totalHours()).isEqualByComparingTo("45.00");
            assertThat(r.bonusHours()).isEqualByComparingTo("7.50");     // 0,25 × 30
            assertThat(r.billableHours()).isEqualByComparingTo("52.50");
            assertThat(r.totalAmount()).isEqualByComparingTo("341250.00");
        }
    }
}
