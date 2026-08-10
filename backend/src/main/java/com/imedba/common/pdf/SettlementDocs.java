package com.imedba.common.pdf;

import static com.imedba.common.pdf.SettlementPdfRenderer.date;
import static com.imedba.common.pdf.SettlementPdfRenderer.hours;
import static com.imedba.common.pdf.SettlementPdfRenderer.money;
import static com.imedba.common.pdf.SettlementPdfRenderer.pct;
import static com.imedba.common.pdf.SettlementPdfRenderer.period;

import com.imedba.common.pdf.SettlementDoc.Row;
import com.imedba.modules.diplomasettlement.entity.DiplomaSettlement;
import com.imedba.modules.diplomasettlement.entity.DirectorDistribution;
import com.imedba.modules.salescommission.entity.SalesCommissionLine;
import com.imedba.modules.salescommission.entity.SalesCommissionSettlement;
import com.imedba.modules.teaching.entity.TeachingRole;
import com.imedba.modules.teaching.entity.TeachingSettlement;
import com.imedba.modules.teaching.entity.TeachingSettlementLine;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Arma el {@link SettlementDoc} de cada tipo de liquidación. Es sólo mapeo: el
 * cálculo ya está hecho y congelado en la entidad al momento de liquidar, así que
 * el comprobante nunca recalcula nada — muestra lo que se pagó.
 */
public final class SettlementDocs {

    private SettlementDocs() {}

    // ─── Diplomatura (PREMA) ──────────────────────────────────────────────────

    public static SettlementDoc ofDiploma(DiplomaSettlement s) {
        String diplomaName = s.getDiploma() != null ? s.getDiploma().getName() : "Diplomatura";

        List<Row> breakdown = new ArrayList<>();
        breakdown.add(new Row("Total cobrado en el mes", money(s.getTotalCollected())));
        breakdown.add(new Row("Impuestos y comisiones", "- " + money(s.getTaxCommissionAmount()),
                pct(safeDiv(s.getInputTaxCommissionPct())) + " sobre lo cobrado"));
        breakdown.add(new Row("Subtotal 1", money(s.getSubtotal1())));
        breakdown.add(new Row("Secretaría", "- " + money(s.getSecretaryAmount())));
        breakdown.add(new Row("Publicidad", "- " + money(s.getAdvertisingAmount())));
        breakdown.add(new Row("Administración IMEDBA", "- " + money(s.getAdministrationAmount())));
        breakdown.add(new Row("Gastos varios", "- " + money(s.getMiscExpensesAmount())));
        breakdown.add(new Row("Subtotal 2", money(s.getSubtotal2()),
                "se parte 50/50 entre directoras y empresa"));
        breakdown.add(new Row("Mitad de directoras", money(s.getHalfAmount())));
        breakdown.add(new Row("Grabaciones docentes", "- " + money(s.getRecordingsAmount()),
                "sale sólo de la mitad de las directoras"));
        breakdown.add(new Row("A repartir entre directoras", money(s.getDirectorsBaseAmount())));
        // El % aplicado va como hint: con sólo los importes, un reparto cargado al
        // revés (80 a UNTREF) no se distingue de uno correcto.
        breakdown.add(new Row("IMEDBA", money(s.getImedbaAmount()),
                pct(safeDiv(s.getInputImedbaPct())) + " de la mitad de la empresa"));
        breakdown.add(new Row("Universidad (UNTREF)", money(s.getUntrefAmount()),
                pct(safeDiv(s.getInputUntrefPct())) + " de la mitad de la empresa"));

        List<List<String>> rows = new ArrayList<>();
        List<DirectorDistribution> dist = s.getDirectorsDistribution();
        if (dist != null) {
            for (DirectorDistribution d : dist) {
                rows.add(List.of(d.name() == null ? "—" : d.name(),
                                 d.email() == null ? "—" : d.email(),
                                 money(d.amount())));
            }
        }

        return new SettlementDoc(
                "Liquidación de diplomatura",
                diplomaName,
                period(s.getPeriodMonth(), s.getPeriodYear()),
                List.of(new Row("Estado", "Pagada"),
                        new Row("Directoras", String.valueOf(rows.size()))),
                rows.isEmpty() ? List.of() : List.of("Directora", "E-mail", "Importe"),
                rows,
                breakdown,
                new Row("Total a directoras", money(s.getDirectorsBaseAmount())),
                "Las directoras reparten en partes iguales. El subtotal 2 cierra exacto: "
                + "directoras + grabaciones + IMEDBA + universidad.");
    }

    // ─── Horas docentes ───────────────────────────────────────────────────────

    public static SettlementDoc ofTeaching(TeachingSettlement s) {
        boolean preceptora = s.getRole() == TeachingRole.PRECEPTORA;

        List<Row> breakdown = new ArrayList<>();
        breakdown.add(new Row("Clases del mes", String.valueOf(nz(s.getClassCount()))));
        breakdown.add(new Row("Horas de clase", hours(s.getTotalHours())));
        if (preceptora) {
            breakdown.add(new Row("Adicional por clase", hours(s.getBonusHours()),
                    hours(s.getPerClassBonusHours()) + " por clase, por llegar antes"));
        }
        breakdown.add(new Row("Horas a pagar", hours(s.getBillableHours())));
        breakdown.add(new Row("Valor hora", money(s.getHourlyRate())));

        List<List<String>> rows = new ArrayList<>();
        List<TeachingSettlementLine> lines = s.getLines();
        if (lines != null) {
            for (TeachingSettlementLine l : lines) {
                rows.add(List.of(date(l.getSessionDate()),
                                 blank(l.getCommission()),
                                 blank(l.getSubject()),
                                 blank(l.getClassLabel()),
                                 hours(l.getHoursPaid())));
            }
        }

        return new SettlementDoc(
                preceptora ? "Liquidación de horas de preceptoría" : "Liquidación de horas docentes",
                s.getStaffName() + " · " + (preceptora ? "Preceptora" : "Docente"),
                period(s.getPeriodMonth(), s.getPeriodYear()),
                List.of(new Row("Estado", "Pagada"),
                        new Row("Factura recibida", Boolean.TRUE.equals(s.getInvoiceReceived()) ? "Sí" : "No")),
                rows.isEmpty() ? List.of() : List.of("Fecha", "Comisión", "Materia", "Clase", "Horas"),
                rows,
                breakdown,
                new Row("Total", money(s.getTotalAmount())),
                "Sólo entran las clases sincrónicas del período. Las horas son las reales "
                + "informadas por secretaría, que pueden diferir de las programadas.");
    }

    // ─── Ventas y comisiones ──────────────────────────────────────────────────

    public static SettlementDoc ofCommission(SalesCommissionSettlement s) {
        int threshold = nz(s.getTierThreshold());

        List<Row> breakdown = new ArrayList<>();
        breakdown.add(new Row("Primeras " + threshold + " ventas", money(s.getTier1Commission()),
                pct(s.getTier1Rate()) + " sobre " + money(s.getTier1Base())));
        breakdown.add(new Row("De la venta " + (threshold + 1) + " en adelante", money(s.getTier2Commission()),
                pct(s.getTier2Rate()) + " sobre " + money(s.getTier2Base())));
        breakdown.add(new Row("Libros", money(s.getBooksCommission()),
                pct(s.getBooksRate()) + " sobre " + money(s.getBooksBase())));
        if (s.getPriorMonthsCommission() != null && s.getPriorMonthsCommission().signum() > 0) {
            breakdown.add(new Row("Cobros de meses anteriores", money(s.getPriorMonthsCommission()),
                    "sobre " + money(s.getPriorMonthsBase())));
        }

        List<List<String>> rows = new ArrayList<>();
        List<SalesCommissionLine> lines = s.getLines();
        if (lines != null) {
            for (SalesCommissionLine l : lines) {
                rows.add(List.of(date(l.getSaleDate()),
                                 blank(l.getStudentName()),
                                 blank(l.getProductName()),
                                 l.getSaleMonthRank() == null ? "—" : String.valueOf(l.getSaleMonthRank()),
                                 pct(l.getRateApplied()),
                                 money(l.getCollectedAmount()),
                                 money(l.getCommissionAmount())));
            }
        }

        return new SettlementDoc(
                "Liquidación de comisiones de ventas",
                s.getSellerName() == null ? "Vendedora" : s.getSellerName(),
                period(s.getPeriodMonth(), s.getPeriodYear()),
                List.of(new Row("Estado", "Pagada"),
                        new Row("Operaciones", String.valueOf(rows.size()))),
                rows.isEmpty() ? List.of()
                        : List.of("Fecha", "Alumno", "Producto", "#", "Tasa", "Cobrado", "Comisión"),
                rows,
                breakdown,
                new Row("Total", money(s.getTotalCommission())),
                "La comisión se calcula sobre lo COBRADO en el mes, no sobre lo facturado. "
                + "El número « # » es el orden de la venta en su mes de origen, que define el tramo. "
                + "Los libros no consumen ese orden.");
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private static int nz(Integer v) {
        return v == null ? 0 : v;
    }

    private static String blank(String v) {
        return v == null || v.isBlank() ? "—" : v;
    }

    /** El porcentaje de impuestos se guarda como 25.1, no como 0.251. */
    private static BigDecimal safeDiv(BigDecimal pctValue) {
        return pctValue == null ? null : pctValue.movePointLeft(2);
    }
}
