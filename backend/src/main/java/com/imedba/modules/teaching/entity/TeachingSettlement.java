package com.imedba.modules.teaching.entity;

import com.imedba.modules.staff.entity.Staff;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
 * Liquidación mensual de una persona por su trabajo docente o de preceptoría (V037).
 *
 * <p>El valor hora se congela al liquidar: cambiar la tarifa del catálogo después
 * no debe reescribir lo ya emitido.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "teaching_settlements")
@EntityListeners(AuditingEntityListener.class)
public class TeachingSettlement {

    @Id
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "staff_id", nullable = false)
    private Staff staff;

    @Column(name = "staff_name", length = 200)
    private String staffName;

    @Column(name = "period_year", nullable = false)
    private Integer periodYear;

    @Column(name = "period_month", nullable = false)
    private Integer periodMonth;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private TeachingRole role;

    @Column(name = "hourly_rate", nullable = false, precision = 12, scale = 2)
    private BigDecimal hourlyRate;

    /** Horas extra por clase. 0,25 para preceptoras, 0 para docentes. */
    @Default
    @Column(name = "per_class_bonus_hours", nullable = false, precision = 6, scale = 2)
    private BigDecimal perClassBonusHours = BigDecimal.ZERO;

    @Default
    @Column(name = "class_count", nullable = false)
    private Integer classCount = 0;

    /** Suma de las horas a pagar de las clases del período. */
    @Default
    @Column(name = "total_hours", nullable = false, precision = 8, scale = 2)
    private BigDecimal totalHours = BigDecimal.ZERO;

    /** {@code perClassBonusHours × classCount}. */
    @Default
    @Column(name = "bonus_hours", nullable = false, precision = 8, scale = 2)
    private BigDecimal bonusHours = BigDecimal.ZERO;

    @Default
    @Column(name = "billable_hours", nullable = false, precision = 8, scale = 2)
    private BigDecimal billableHours = BigDecimal.ZERO;

    @Default
    @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    // ─── Flujo de factura ────────────────────────────────────────────────────

    @Column(name = "invoice_email_sent_at")
    private Instant invoiceEmailSentAt;

    @Default
    @Column(name = "invoice_received", nullable = false)
    private Boolean invoiceReceived = Boolean.FALSE;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TeachingSettlementStatus status = TeachingSettlementStatus.DRAFT;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Default
    @OneToMany(mappedBy = "settlement", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sessionDate ASC")
    private List<TeachingSettlementLine> lines = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    /** Reemplaza el detalle completo (recompute del DRAFT). */
    public void replaceLines(List<TeachingSettlementLine> newLines) {
        this.lines.clear();
        if (newLines != null) {
            newLines.forEach(l -> l.setSettlement(this));
            this.lines.addAll(newLines);
        }
    }
}
