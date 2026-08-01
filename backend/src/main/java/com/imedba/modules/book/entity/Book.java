package com.imedba.modules.book.entity;

import com.imedba.common.entity.BaseEntity;
import com.imedba.modules.course.entity.BusinessUnit;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

/**
 * Libro del catálogo editorial. Mantiene stock plano (stock_quantity + branch)
 * por decisión del ERD simplificado. Si en el futuro se necesita stock por sede,
 * se migra a {@code book_stocks} y se deja {@code stock_quantity} como total
 * calculado.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "books")
@SQLDelete(sql = "UPDATE books SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class Book extends BaseEntity {

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    /**
     * Unidad en la que se ofrece el libro (V036). Filtra el selector de libros de la
     * inscripción por la unidad del curso: un alumno de Residencias no debería poder
     * sumar el libro de PREMA a su matrícula. NULL = disponible en todas.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "business_unit", length = 30)
    private BusinessUnit businessUnit;

    @Column(name = "code", length = 20)
    private String code;

    @Column(name = "specialty", length = 100)
    private String specialty;

    @Column(name = "format", length = 50)
    private String format;

    @Column(name = "edition", length = 50)
    private String edition;

    @Column(name = "pages")
    private Integer pages;

    @Column(name = "sale_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal salePrice;

    @Default
    @Column(name = "student_discount_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal studentDiscountPct = new BigDecimal("30.00");

    /**
     * % del precio de venta que va a la torta de autorías; los
     * royalty_percentage de book_authors reparten este pool (doc 09 §3.4).
     */
    @Default
    @Column(name = "royalty_pool_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal royaltyPoolPct = new BigDecimal("10.00");

    @Column(name = "cost_per_unit", precision = 12, scale = 2)
    private BigDecimal costPerUnit;

    @Default
    @Column(name = "stock_quantity", nullable = false)
    private Integer stockQuantity = 0;

    @Column(name = "branch", length = 100)
    private String branch;

    @Default
    @Column(name = "is_active", nullable = false)
    private Boolean active = Boolean.TRUE;
}
