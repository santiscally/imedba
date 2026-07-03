package com.imedba.modules.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.imedba.modules.notification.contract.ContractData;
import com.imedba.modules.notification.contract.ContractPdfRenderer;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ContractPdfRendererTests {

    private final ContractPdfRenderer renderer = new ContractPdfRenderer();

    @Test
    @DisplayName("render produce un PDF no vacío con la cabecera %PDF")
    void render_produces_pdf() {
        ContractData data = new ContractData(
                "Ileana", "Rivero", "Argentina", "30.123.456",
                LocalDate.of(1990, 5, 12), "ileana@example.com",
                new BigDecimal("812500.00"), new BigDecimal("812500.00"), "15%",
                "Salta Intensivo", LocalDate.of(2026, 3, 1), null);

        byte[] pdf = renderer.render(data);

        assertThat(pdf).isNotEmpty();
        assertThat(pdf.length).isGreaterThan(1000);
        String head = new String(pdf, 0, 5, StandardCharsets.ISO_8859_1);
        assertThat(head).startsWith("%PDF-");
    }

    @Test
    @DisplayName("render tolera fechas de grupo nulas (Inicio/Fin = 'A confirmar')")
    void render_tolerates_null_group_dates() {
        ContractData data = new ContractData(
                "Sin", "Fechas", "Argentina", "20.000.000",
                null, "sf@example.com",
                new BigDecimal("100000"), new BigDecimal("100000"), "—",
                "Curso X", null, null);

        byte[] pdf = renderer.render(data);

        assertThat(pdf.length).isGreaterThan(1000);
    }
}
