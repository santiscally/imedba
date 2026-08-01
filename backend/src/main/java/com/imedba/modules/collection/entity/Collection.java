package com.imedba.modules.collection.entity;

import com.imedba.common.entity.BaseEntity;
import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.book.entity.Book;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

/**
 * Colección de libros (reunión 2026-06-05, Nico): los alumnos compran la colección
 * entera (ej. los 7 libros de Residencias) con un descuento. La misma lista de libros
 * existe en dos variantes (anillada/tradicional) con precios distintos.
 *
 * <p>El precio es el de lista de la colección; el % de descuento alumno se aplica al
 * vender. Al vender una colección se generan N {@code book_sales} (una por libro,
 * repartiendo el precio proporcional al precio de lista de cada libro) para que las
 * autorías se calculen por libro.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "collections")
@SQLDelete(sql = "UPDATE collections SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class Collection extends BaseEntity {

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    /** Unidad en la que se ofrece (V036). NULL = disponible en todas. */
    @Enumerated(EnumType.STRING)
    @Column(name = "business_unit", length = 30)
    private BusinessUnit businessUnit;

    @Enumerated(EnumType.STRING)
    @Column(name = "variant", nullable = false, length = 20)
    private CollectionVariant variant;

    @Column(name = "price", nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Default
    @Column(name = "student_discount_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal studentDiscountPct = new BigDecimal("35.00");

    @Default
    @Column(name = "is_active", nullable = false)
    private Boolean active = Boolean.TRUE;

    @Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "collection_books",
            joinColumns = @JoinColumn(name = "collection_id"),
            inverseJoinColumns = @JoinColumn(name = "book_id"))
    private List<Book> books = new ArrayList<>();
}
