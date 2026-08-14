package com.imedba.common.pdf;

import java.util.List;

/**
 * Modelo de vista del comprobante de liquidación. Las tres liquidaciones
 * (diplomatura, horas docentes, comisiones de ventas) comparten el mismo layout y
 * sólo cambian los datos, así que hay UN template y tres mapeos — no tres HTML
 * casi iguales que después se desincronizan.
 *
 * @param docTitle   qué liquidación es
 * @param subject    a quién/qué corresponde (la docente, la vendedora, la diplomatura)
 * @param period     «Mayo 2026»
 * @param meta       datos de cabecera (estado, fecha de pago, valor hora…)
 * @param columns    encabezados del detalle; vacío = sin tabla de detalle
 * @param rows       filas del detalle, alineadas con {@code columns}
 * @param breakdown  el cálculo paso a paso
 * @param total      la línea destacada del final
 * @param note       aclaración al pie (de dónde salen los números)
 */
public record SettlementDoc(
        String docTitle,
        String subject,
        String period,
        List<Row> meta,
        List<String> columns,
        List<List<String>> rows,
        List<Row> breakdown,
        Row total,
        String note
) {

    /** Par etiqueta/valor. {@code hint} es la letra chica opcional debajo de la etiqueta. */
    public record Row(String label, String value, String hint) {
        public Row(String label, String value) {
            this(label, value, null);
        }
    }
}
