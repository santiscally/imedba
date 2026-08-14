package com.imedba.modules.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.imedba.modules.notification.template.NotificationTemplate;
import com.imedba.modules.notification.template.NotificationTemplates;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * Tests de las dos plantillas de pedido de factura, contra los mails que mandó
 * Nico el 2026-07-31. Lo que se fija acá es el <b>texto y los datos que el cliente
 * espera ver</b>: si alguien reescribe el cuerpo, estos tests avisan.
 */
class InvoiceRequestTemplateTests {

    @Nested
    @DisplayName("Honorarios docentes")
    class Docentes {

        /** Reproduce el mail real de Ana: 2,5 h + 2 h = 4,5 h × $75.000 = $337.500. */
        private NotificationTemplate mailDeAna() {
            return NotificationTemplates.teachingInvoiceRequest(
                    "Ana",
                    List.of("Clase 7/5: Medicina Interna CLIN 80 - Gastro - 2,5 hs",
                            "Clase 12/5: Medicina Interna CLIN 80 - Hemato, dermato, reumato - 2 hs"),
                    new BigDecimal("4.5"),
                    new BigDecimal("337500"));
        }

        @Test
        @DisplayName("El asunto es exactamente el que usa Cobranzas")
        void asunto() {
            assertThat(mailDeAna().subject()).isEqualTo("Imedba - Honorarios docentes");
        }

        @Test
        @DisplayName("Saluda por el nombre y pide la factura")
        void saludo_y_pedido() {
            String body = mailDeAna().body();
            assertThat(body).contains("Hola Ana, buen día!");
            assertThat(body).contains("te paso el detalle de tus horas");
            assertThat(body).contains("nos hagas");
            assertThat(body).contains("factura");
        }

        @Test
        @DisplayName("Lista una línea por clase, con las horas de cada una")
        void detalle_por_clase() {
            String body = mailDeAna().body();
            assertThat(body).contains("Clase 7/5: Medicina Interna CLIN 80 - Gastro - 2,5 hs");
            assertThat(body).contains("Clase 12/5:");
        }

        @Test
        @DisplayName("El total va con coma decimal y miles con punto, como lo escribe Cobranzas")
        void formato_del_total() {
            String body = mailDeAna().body();
            // «4,5 horas» y no «4.5»; «337.500» y no «337500.00».
            assertThat(body).contains("4,5 horas");
            assertThat(body).contains("337.500");
            assertThat(body).doesNotContain("337500.00");
        }

        @Test
        @DisplayName("Incluye los datos de facturación de IMEDBA")
        void datos_de_facturacion() {
            String body = mailDeAna().body();
            assertThat(body).contains("Imedba Plataforma CIE SRL");
            assertThat(body).contains("30716062666");
            assertThat(body).contains("Rojas 61 - CABA");
            assertThat(body).contains("Responsable Inscripto");
            assertThat(body).contains("Honorarios docentes");
        }

        @Test
        @DisplayName("Cierra con la firma del Departamento de Cobranzas")
        void firma() {
            assertThat(mailDeAna().body())
                    .contains("Departamento de Cobranzas")
                    .contains("+54 9 11 2395 3954");
        }

        @Test
        @DisplayName("Sin clases el mail sigue armándose, sin detalle")
        void sin_clases() {
            NotificationTemplate t = NotificationTemplates.teachingInvoiceRequest(
                    "Ana", List.of(), BigDecimal.ZERO, BigDecimal.ZERO);
            assertThat(t.body()).contains("Hola Ana");
            assertThat(t.body()).doesNotContain("Clase ");
        }

        @Test
        @DisplayName("El nombre se escapa: no se puede inyectar HTML")
        void escapa_el_nombre() {
            NotificationTemplate t = NotificationTemplates.teachingInvoiceRequest(
                    "<script>x</script>", List.of(), BigDecimal.ONE, BigDecimal.TEN);
            assertThat(t.body()).doesNotContain("<script>");
            assertThat(t.body()).contains("&lt;script&gt;");
        }
    }

    @Nested
    @DisplayName("Formación Superior — directoras de PREMA")
    class Directoras {

        private NotificationTemplate mail() {
            return NotificationTemplates.diplomaSettlementInvoiceRequest(
                    "Iris", 6, 2026, new BigDecimal("657602.57"));
        }

        @Test
        @DisplayName("El asunto es el que usa Cobranzas para Formación Superior")
        void asunto() {
            assertThat(mail().subject()).isEqualTo("Imedba - Formación Superior Honorarios");
        }

        @Test
        @DisplayName("Nombra el mes en castellano y el importe a facturar")
        void cuerpo() {
            String body = mail().body();
            assertThat(body).contains("Hola Iris");
            assertThat(body).contains("finalizado el mes de junio de 2026");
            assertThat(body).contains("657.602,57");
            assertThat(body).contains("en relación a lo cobrado durante el mes");
            assertThat(body).contains("me envíe la factura");
        }

        @Test
        @DisplayName("Cierra con la firma del Departamento de Cobranzas")
        void firma() {
            assertThat(mail().body()).contains("Departamento de Cobranzas");
        }

        @Test
        @DisplayName("Los 12 meses se nombran sin salirse del array")
        void todos_los_meses() {
            for (int m = 1; m <= 12; m++) {
                NotificationTemplate t = NotificationTemplates
                        .diplomaSettlementInvoiceRequest("X", m, 2026, BigDecimal.ONE);
                assertThat(t.body()).contains("finalizado el mes de");
            }
        }
    }
}
