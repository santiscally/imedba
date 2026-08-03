package com.imedba.common.pdf;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Comprobante de liquidación en PDF, para archivar y mandarle a quien cobró
 * (pedido 2026-08-03: «un PDF por cada liquidación con la info, cuando ya se pagó»).
 *
 * <p>Reusa openhtmltopdf, el mismo motor del contrato de matrícula. El input tiene
 * que ser XHTML bien formado: cualquier tag sin cerrar hace fallar el render, no lo
 * repara. Por eso todo el texto variable pasa por {@link #esc(String)}.
 */
@Component
public class SettlementPdfRenderer {

    private static final DateTimeFormatter DATE_ES = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final String[] MONTHS = {
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    };

    public byte[] render(SettlementDoc doc) {
        StringBuilder html = new StringBuilder(DOC_OPEN);
        html.append(header(doc));
        if (!doc.columns().isEmpty() && !doc.rows().isEmpty()) {
            html.append(detail(doc));
        }
        html.append(breakdown(doc));
        html.append(footer(doc));
        html.append(DOC_CLOSE);

        try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html.toString(), null);
            builder.toStream(os);
            builder.run();
            return os.toByteArray();
        } catch (IOException e) {
            throw new SettlementPdfException("Error generando el PDF de la liquidación", e);
        }
    }

    // ─── secciones ────────────────────────────────────────────────────────────

    private static String header(SettlementDoc d) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"brand\">")
          .append("<h1>IMEDBA</h1>")
          .append("<p class=\"addr\">Imedba Plataforma CIE SRL · CUIT 30716062666 · Rojas 61 - CABA</p>")
          .append("</div>");
        sb.append("<h2 class=\"doc-title\">").append(esc(d.docTitle())).append("</h2>");
        sb.append("<p class=\"subject\">").append(esc(d.subject()))
          .append(" &#183; <strong>").append(esc(d.period())).append("</strong></p>");

        if (!d.meta().isEmpty()) {
            sb.append("<table class=\"meta\">");
            for (SettlementDoc.Row r : d.meta()) {
                sb.append("<tr><td class=\"label\">").append(esc(r.label()))
                  .append("</td><td>").append(esc(r.value())).append("</td></tr>");
            }
            sb.append("</table>");
        }
        return sb.toString();
    }

    private static String detail(SettlementDoc d) {
        StringBuilder sb = new StringBuilder("<h3 class=\"section\">Detalle</h3><table class=\"detail\"><thead><tr>");
        for (String c : d.columns()) {
            sb.append("<th>").append(esc(c)).append("</th>");
        }
        sb.append("</tr></thead><tbody>");
        for (List<String> row : d.rows()) {
            sb.append("<tr>");
            for (int i = 0; i < row.size(); i++) {
                // La última columna es siempre el número: va a la derecha.
                String cls = i == row.size() - 1 ? " class=\"num\"" : "";
                sb.append("<td").append(cls).append(">").append(esc(row.get(i))).append("</td>");
            }
            sb.append("</tr>");
        }
        sb.append("</tbody></table>");
        return sb.toString();
    }

    private static String breakdown(SettlementDoc d) {
        StringBuilder sb = new StringBuilder("<h3 class=\"section\">Cálculo</h3><table class=\"calc\">");
        for (SettlementDoc.Row r : d.breakdown()) {
            sb.append("<tr><td class=\"label\">").append(esc(r.label()));
            if (r.hint() != null && !r.hint().isBlank()) {
                sb.append("<span class=\"hint\">").append(esc(r.hint())).append("</span>");
            }
            sb.append("</td><td class=\"num\">").append(esc(r.value())).append("</td></tr>");
        }
        if (d.total() != null) {
            sb.append("<tr class=\"total\"><td class=\"label\">").append(esc(d.total().label()))
              .append("</td><td class=\"num\">").append(esc(d.total().value())).append("</td></tr>");
        }
        sb.append("</table>");
        return sb.toString();
    }

    private static String footer(SettlementDoc d) {
        StringBuilder sb = new StringBuilder();
        if (d.note() != null && !d.note().isBlank()) {
            sb.append("<p class=\"note\">").append(esc(d.note())).append("</p>");
        }
        sb.append("<p class=\"emitted\">Comprobante emitido el ")
          .append(LocalDate.now().format(DATE_ES))
          .append(" &#183; documento interno, no es una factura.</p>");
        return sb.toString();
    }

    // ─── helpers de formato ───────────────────────────────────────────────────

    /** «Mayo 2026». */
    public static String period(int month, int year) {
        String m = month >= 1 && month <= 12 ? MONTHS[month - 1] : String.valueOf(month);
        return m + " " + year;
    }

    /** «$1.315.205,14» — es-AR: punto de miles, coma decimal. */
    public static String money(BigDecimal v) {
        if (v == null) return "—";
        DecimalFormatSymbols s = new DecimalFormatSymbols(Locale.forLanguageTag("es-AR"));
        s.setGroupingSeparator('.');
        s.setDecimalSeparator(',');
        return "$" + new DecimalFormat("#,##0.00", s).format(v);
    }

    /** «7,25 h» sin ceros de relleno. */
    public static String hours(BigDecimal v) {
        if (v == null) return "—";
        DecimalFormatSymbols s = new DecimalFormatSymbols(Locale.forLanguageTag("es-AR"));
        s.setDecimalSeparator(',');
        return new DecimalFormat("0.##", s).format(v) + " h";
    }

    /** Fracción a porcentaje: 0,005 -> «0,5%». */
    public static String pct(BigDecimal v) {
        if (v == null) return "—";
        DecimalFormatSymbols s = new DecimalFormatSymbols(Locale.forLanguageTag("es-AR"));
        s.setDecimalSeparator(',');
        return new DecimalFormat("0.###", s).format(v.multiply(new BigDecimal("100"))) + "%";
    }

    public static String date(LocalDate d) {
        return d == null ? "—" : d.format(DATE_ES);
    }

    /** XHTML: sin esto un apellido con «&» rompe el render entero. */
    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    // ─── template ─────────────────────────────────────────────────────────────

    private static final String DOC_OPEN = """
            <html><head><meta charset="UTF-8" /><style>
              @page { size: A4; margin: 2cm 1.8cm; }
              body { font-family: sans-serif; font-size: 10pt; color: #1f2937; }
              .brand { border-bottom: 2px solid #1f2937; padding-bottom: 6px; margin-bottom: 14px; }
              .brand h1 { font-size: 17pt; margin: 0; letter-spacing: 1px; }
              .brand .addr { font-size: 7.5pt; color: #6b7280; margin: 2px 0 0; }
              .doc-title { font-size: 13pt; margin: 0 0 2px; }
              .subject { font-size: 10pt; color: #374151; margin: 0 0 12px; }
              h3.section { font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.5px;
                           color: #6b7280; margin: 16px 0 6px; }
              table { width: 100%; border-collapse: collapse; }
              table.meta td { padding: 2px 0; font-size: 9pt; }
              table.meta .label { color: #6b7280; width: 38%; }
              table.detail { font-size: 8.5pt; margin-bottom: 4px; }
              table.detail th { text-align: left; border-bottom: 1px solid #9ca3af;
                                padding: 4px 6px 4px 0; font-size: 8pt; color: #374151; }
              table.detail td { padding: 3px 6px 3px 0; border-bottom: 1px solid #e5e7eb; }
              table.calc td { padding: 4px 0; font-size: 9.5pt; border-bottom: 1px solid #f0f1f3; }
              table.calc .label { color: #374151; }
              table.calc .hint { display: block; font-size: 7.5pt; color: #9ca3af; }
              .num { text-align: right; white-space: nowrap; }
              tr.total td { border-top: 1.5px solid #1f2937; border-bottom: none;
                            padding-top: 7px; font-size: 11.5pt; font-weight: bold; }
              .note { font-size: 8pt; color: #6b7280; margin-top: 14px; line-height: 1.4; }
              .emitted { font-size: 7.5pt; color: #9ca3af; margin-top: 4px; }
            </style></head><body>
            """;

    private static final String DOC_CLOSE = "</body></html>";
}
