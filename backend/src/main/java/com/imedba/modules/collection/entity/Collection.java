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

/** Colección de libros: su precio es la suma de sus libros y al venderla se genera una book_sale prorrateada por libro. */
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
