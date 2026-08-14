package com.imedba.modules.salescommission.entity;

/**
 * Origen de una línea de comisión.
 *
 * <p>{@link #ENROLLMENT} y {@link #DIPLOMA_ENROLLMENT} son ventas de curso: consumen
 * posición en el ranking mensual (1..30 → alícuota baja, 31+ → alícuota alta).
 *
 * <p>{@link #BOOK_SALE} es venta de libro suelto o colección: alícuota fija y
 * <b>no</b> consume posición en el ranking (doc 17 §3.1, regla 4).
 *
 * <p>Nota: los libros que se venden <i>dentro</i> de una inscripción no llegan acá
 * como {@code BOOK_SALE}. Viajan en {@code enrollments.book_price}, que forma parte
 * de {@code total_price} y por lo tanto de los pagos de esa inscripción — o sea que
 * ya quedan cubiertos por la línea {@code ENROLLMENT} y con la alícuota del curso,
 * exactamente como en la planilla (columna «Libros» sumada al «Precio final»).
 */
public enum CommissionSourceType {
    ENROLLMENT,
    DIPLOMA_ENROLLMENT,
    BOOK_SALE;

    /** true si la venta ocupa un lugar en el ranking mensual que define la alícuota. */
    public boolean consumesRank() {
        return this != BOOK_SALE;
    }
}
