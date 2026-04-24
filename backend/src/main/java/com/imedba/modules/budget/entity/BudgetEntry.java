package com.imedba.modules.budget.entity;

import com.imedba.common.enums.PaymentMethod;
import com.imedba.modules.booksale.entity.BookSale;
import com.imedba.modules.contact.entity.Contact;
import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.payment.entity.Payment;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Entrada unificada de presupuesto. INCOME/EXPENSE con categoría + unidad de
 * negocio. No extiende BaseEntity: no tiene soft delete (las correcciones se
 * hacen con una entrada de signo opuesto y concept="AJUSTE: ...").
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "budget_entries")
@EntityListeners(AuditingEntityListener.class)
public class BudgetEntry {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 10)
    private EntryType entryType;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private BudgetCategory category;

    @Column(name = "subcategory", length = 100)
    private String subcategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "business_unit", length = 50)
    private BusinessUnit businessUnit;

    @Column(name = "concept", nullable = false, length = 300)
    private String concept;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(name = "period_month", nullable = false)
    private Integer periodMonth;

    @Column(name = "period_year", nullable = false)
    private Integer periodYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 30)
    private PaymentMethod paymentMethod;

    @Default
    @Column(name = "is_recurring", nullable = false)
    private Boolean recurring = Boolean.FALSE;

    @Default
    @Column(name = "is_cash", nullable = false)
    private Boolean cash = Boolean.FALSE;

    @Default
    @Column(name = "is_projected", nullable = false)
    private Boolean projected = Boolean.FALSE;

    @Column(name = "reference_number", length = 200)
    private String referenceNumber;

    @Column(name = "receipt_file_path", length = 500)
    private String receiptFilePath;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id")
    private Contact contact;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id")
    private Enrollment enrollment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_sale_id")
    private BookSale bookSale;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "registered_by")
    private UUID registeredBy;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BudgetEntry that)) return false;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
