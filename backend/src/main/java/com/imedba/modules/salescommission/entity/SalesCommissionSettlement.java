package com.imedba.modules.salescommission.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
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
 * Liquidación mensual de comisiones de una vendedora (V033).
 *
 * <p>Los buckets replican las filas de la planilla que IMEDBA lleva a mano:
 * cursos al tramo bajo, cursos al tramo alto, libros, y ventas de meses anteriores
 * que cobraron en este período.
 *
 * <p>Los parámetros ({@code tier*Rate}, {@code booksRate}, {@code tierThreshold})
 * se congelan al liquidar: cambiar la política de comisiones no debe reescribir lo
 * ya emitido (mismo criterio que V018 para diplomaturas).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "sales_commission_settlements")
@EntityListeners(AuditingEntityListener.class)
public class SalesCommissionSettlement {

    @Id
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /** sub de Keycloak — el mismo id que queda en {@code enrollments.enrolled_by}. */
    @Column(name = "seller_user_id", nullable = false)
    private UUID sellerUserId;

    @Column(name = "seller_name", length = 200)
    private String sellerName;

    @Column(name = "period_month", nullable = false)
    private Integer periodMonth;

    @Column(name = "period_year", nullable = false)
    private Integer periodYear;

    // ─── Parámetros congelados ───────────────────────────────────────────────

    @Column(name = "tier1_rate", nullable = false, precision = 6, scale = 5)
    private BigDecimal tier1Rate;

    @Column(name = "tier2_rate", nullable = false, precision = 6, scale = 5)
    private BigDecimal tier2Rate;

    @Column(name = "books_rate", nullable = false, precision = 6, scale = 5)
    private BigDecimal booksRate;

    @Column(name = "tier_threshold", nullable = false)
    private Integer tierThreshold;

    // ─── Buckets ─────────────────────────────────────────────────────────────

    @Column(name = "tier1_base", nullable = false, precision = 14, scale = 2)
    private BigDecimal tier1Base;

    @Column(name = "tier1_commission", nullable = false, precision = 14, scale = 2)
    private BigDecimal tier1Commission;

    @Column(name = "tier2_base", nullable = false, precision = 14, scale = 2)
    private BigDecimal tier2Base;

    @Column(name = "tier2_commission", nullable = false, precision = 14, scale = 2)
    private BigDecimal tier2Commission;

    @Column(name = "books_base", nullable = false, precision = 14, scale = 2)
    private BigDecimal booksBase;

    @Column(name = "books_commission", nullable = false, precision = 14, scale = 2)
    private BigDecimal booksCommission;

    @Column(name = "prior_months_base", nullable = false, precision = 14, scale = 2)
    private BigDecimal priorMonthsBase;

    @Column(name = "prior_months_commission", nullable = false, precision = 14, scale = 2)
    private BigDecimal priorMonthsCommission;

    /**
     * Único punto de redondeo del cálculo. No es la suma de los cuatro buckets
     * redondeados: se suma sin redondear y se redondea una sola vez acá.
     */
    @Column(name = "total_commission", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalCommission;

    @Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SalesCommissionStatus status = SalesCommissionStatus.DRAFT;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Default
    @OneToMany(mappedBy = "settlement", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("saleDate ASC")
    private List<SalesCommissionLine> lines = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    /** Reemplaza el detalle completo (recompute del DRAFT). */
    public void replaceLines(List<SalesCommissionLine> newLines) {
        this.lines.clear();
        if (newLines != null) {
            newLines.forEach(l -> l.setSettlement(this));
            this.lines.addAll(newLines);
        }
    }
}
