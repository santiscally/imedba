package com.imedba.modules.salescommission.repository;

import com.imedba.modules.booksale.entity.BookSale;
import com.imedba.modules.enrollment.entity.Enrollment;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Queries que alimentan el motor de comisiones. Es un repo de lectura sobre
 * entidades de otros módulos: no persiste nada propio.
 *
 * <p>Se cuelga de {@link Enrollment} sólo porque Spring Data necesita una entidad
 * raíz; todas las consultas son explícitas.
 */
@Repository
public interface CommissionSourceRepository extends JpaRepository<Enrollment, UUID> {

    /**
     * Todas las inscripciones vendidas por el vendedor en la ventana dada,
     * <b>incluidas las que no cobraron nada en el período liquidado</b>: ocupan
     * lugar en el ranking de su mes y corren la alícuota de las que vienen después.
     */
    @Query("""
           SELECT e FROM Enrollment e
             JOIN FETCH e.student s
             JOIN FETCH e.course c
            WHERE e.enrolledBy = :seller
              AND e.enrollmentDate >= :from
              AND e.enrollmentDate <  :to
            ORDER BY e.enrollmentDate ASC
           """)
    List<Enrollment> findEnrollmentsBySeller(
            @Param("seller") UUID seller,
            @Param("from") Instant from,
            @Param("to") Instant to);

    /**
     * Cobrado por inscripción dentro del período.
     *
     * <p>Toma {@code p.amount} y <b>no</b> suma {@code lateFeeAmount}: el recargo por
     * mora es una penalidad financiera, no valor de venta, y no aparece en la planilla
     * que usa IMEDBA. Pendiente de confirmar con Nico (doc 17 §7.9).
     */
    @Query("""
           SELECT p.enrollment.id, COALESCE(SUM(p.amount), 0)
             FROM Payment p
            WHERE p.enrollment.enrolledBy = :seller
              AND p.paymentDate >= :from
              AND p.paymentDate <  :to
            GROUP BY p.enrollment.id
           """)
    List<Object[]> sumCollectedByEnrollment(
            @Param("seller") UUID seller,
            @Param("from") Instant from,
            @Param("to") Instant to);

    /**
     * Ventas de <b>libros sueltos</b> del período. Se cobran de una sola vez, así que
     * sólo generan comisión en su propio mes de venta.
     *
     * <p><b>{@code bs.enrollment IS NULL} es obligatorio, no una optimización.</b> Un
     * libro vendido dentro de una inscripción ya viaja en {@code enrollments.book_price}
     * → {@code total_price} → los pagos de esa inscripción, así que su comisión sale por
     * la línea del curso. Sin este filtro, un {@code book_sales} con {@code enrollment_id}
     * seteado (lo permite {@code BookSaleCreateRequest.enrollmentId}) se contaría
     * <b>dos veces</b>. Coincide con la planilla, donde la columna «Libros» está sumada
     * dentro del «Precio final» de la fila del curso.
     */
    @Query("""
           SELECT bs FROM BookSale bs
             LEFT JOIN FETCH bs.student
             LEFT JOIN FETCH bs.book
            WHERE bs.soldBy = :seller
              AND bs.enrollment IS NULL
              AND bs.saleDate >= :from
              AND bs.saleDate <  :to
            ORDER BY bs.saleDate ASC
           """)
    List<BookSale> findBookSalesBySeller(
            @Param("seller") UUID seller,
            @Param("from") Instant from,
            @Param("to") Instant to);

    /**
     * Fecha de venta más antigua entre las inscripciones que <b>cobraron algo</b> en el
     * período. Define hasta dónde hay que mirar atrás para que el ranking de cada mes
     * involucrado esté completo.
     *
     * <p>Sin esto habría que elegir una ventana fija hacia atrás, y cualquier cobro de
     * una inscripción más vieja que esa ventana se caería del cálculo en silencio
     * (la vendedora cobraría de menos). Devuelve NULL si no hubo cobros.
     */
    @Query("""
           SELECT MIN(p.enrollment.enrollmentDate) FROM Payment p
            WHERE p.enrollment.enrolledBy = :seller
              AND p.paymentDate >= :from
              AND p.paymentDate <  :to
           """)
    Instant earliestSaleDateCollectingBetween(
            @Param("seller") UUID seller,
            @Param("from") Instant from,
            @Param("to") Instant to);

    /** Vendedores con actividad en el período — para ofrecer a quién liquidar. */
    @Query("""
           SELECT DISTINCT e.enrolledBy FROM Enrollment e
            WHERE e.enrolledBy IS NOT NULL
              AND e.enrollmentDate >= :from
              AND e.enrollmentDate <  :to
           """)
    List<UUID> findSellersWithActivity(
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query("""
           SELECT COALESCE(SUM(p.amount), 0) FROM Payment p
            WHERE p.enrollment.enrolledBy = :seller
              AND p.paymentDate >= :from
              AND p.paymentDate <  :to
           """)
    BigDecimal totalCollectedBySeller(
            @Param("seller") UUID seller,
            @Param("from") Instant from,
            @Param("to") Instant to);
}
