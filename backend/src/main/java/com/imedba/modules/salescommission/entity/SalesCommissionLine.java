package com.imedba.modules.salescommission.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import jakarta.persistence.EntityListeners;

/**
 * Detalle de una liquidación de comisiones: una línea por venta que cobró algo
 * dentro del período. Es la "grilla" que hoy se mantiene a mano en Excel.
 *
 * <p>Los nombres son snapshots a propósito: la línea tiene que seguir leyéndose
 * igual dentro de dos años aunque cambien el nombre del alumno o el del curso.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "sales_commission_lines")
@EntityListeners(AuditingEntityListener.class)
public class SalesCommissionLine {

    @Id
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "settlement_id", nullable = false)
    private SalesCommissionSettlement settlement;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 30)
    private CommissionSourceType sourceType;

    @Column(name = "source_id", nullable = false)
    private UUID sourceId;

    @Column(name = "student_name", length = 300)
    private String studentName;

    @Column(name = "product_name", length = 300)
    private String productName;

    @Column(name = "sale_date", nullable = false)
    private LocalDate saleDate;

    /** Posición dentro del mes de origen. NULL para libros sueltos (no rankean). */
    @Column(name = "sale_month_rank")
    private Integer saleMonthRank;

    @Column(name = "rate_applied", nullable = false, precision = 6, scale = 5)
    private BigDecimal rateApplied;

    @Column(name = "collected_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal collectedAmount;

    @Column(name = "commission_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal commissionAmount;

    /** true si la venta es de un mes anterior al liquidado (fila «comisiones mes anterior»). */
    @Column(name = "from_prior_period", nullable = false)
    private Boolean fromPriorPeriod;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
