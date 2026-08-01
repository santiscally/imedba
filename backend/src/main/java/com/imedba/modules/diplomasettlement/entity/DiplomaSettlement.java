package com.imedba.modules.diplomasettlement.entity;

import com.imedba.modules.diploma.entity.Diploma;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "diploma_settlements")
@EntityListeners(AuditingEntityListener.class)
public class DiplomaSettlement {

    @Id
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "diploma_id", nullable = false)
    private Diploma diploma;

    @Column(name = "period_month", nullable = false)
    private Integer periodMonth;

    @Column(name = "period_year", nullable = false)
    private Integer periodYear;

    @Column(name = "total_collected", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalCollected;

    // ===== Inputs por liquidación (V018, reunión 2026-05-22) =====
    // Si están seteados, ganan sobre los defaults del Diploma.

    @Column(name = "input_tax_commission_pct", precision = 5, scale = 2)
    private BigDecimal inputTaxCommissionPct;

    @Column(name = "input_secretary_salary", precision = 12, scale = 2)
    private BigDecimal inputSecretarySalary;

    @Column(name = "input_advertising_amount", precision = 12, scale = 2)
    private BigDecimal inputAdvertisingAmount;

    /** Administración de IMEDBA — MONTO FIJO. Antes de V035 era un porcentaje. */
    @Column(name = "input_administration_amount", precision = 14, scale = 2)
    private BigDecimal inputAdministrationAmount;

    /** GASTOS VARIOS — monto fijo. Cuarto gasto administrativo, faltaba antes de V035. */
    @Column(name = "input_misc_expenses_amount", precision = 14, scale = 2)
    private BigDecimal inputMiscExpensesAmount;

    /** Grabaciones docentes: se descuenta SÓLO de la mitad de las directoras. */
    @Column(name = "input_recordings_amount", precision = 14, scale = 2)
    private BigDecimal inputRecordingsAmount;

    /** % de la MITAD no-directoras que queda como ganancia IMEDBA (default 80). */
    @Column(name = "input_imedba_pct", precision = 5, scale = 2)
    private BigDecimal inputImedbaPct;

    /** % de la MITAD no-directoras que se acumula para UNTREF (default 20). */
    @Column(name = "input_untref_pct", precision = 5, scale = 2)
    private BigDecimal inputUntrefPct;

    // ===== Outputs (calculados por SettlementEngine, paso por paso) =====

    @Default
    @Column(name = "tax_commission_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal taxCommissionAmount = BigDecimal.ZERO;

    /** Cobrado − impuestos. El «verde» de la planilla de IMEDBA. */
    @Default
    @Column(name = "subtotal_1", nullable = false, precision = 14, scale = 2)
    private BigDecimal subtotal1 = BigDecimal.ZERO;

    @Default
    @Column(name = "secretary_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal secretaryAmount = BigDecimal.ZERO;

    @Default
    @Column(name = "advertising_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal advertisingAmount = BigDecimal.ZERO;

    @Default
    @Column(name = "administration_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal administrationAmount = BigDecimal.ZERO;

    @Default
    @Column(name = "misc_expenses_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal miscExpensesAmount = BigDecimal.ZERO;

    /** Subtotal 1 menos los 4 gastos fijos. El «naranja»: es lo que se parte 50/50. */
    @Default
    @Column(name = "subtotal_2", nullable = false, precision = 14, scale = 2)
    private BigDecimal subtotal2 = BigDecimal.ZERO;

    /** Mitad del subtotal 2. Una va a directoras, la otra se reparte 80/20. */
    @Default
    @Column(name = "half_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal halfAmount = BigDecimal.ZERO;

    @Default
    @Column(name = "recordings_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal recordingsAmount = BigDecimal.ZERO;

    /** Mitad − grabaciones. Es lo que se reparte entre las directoras en partes iguales. */
    @Default
    @Column(name = "directors_base_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal directorsBaseAmount = BigDecimal.ZERO;

    @Default
    @Column(name = "imedba_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal imedbaAmount = BigDecimal.ZERO;

    /** Porción de UNTREF. No se paga mensualmente: se acumula hasta cerrar la comisión. */
    @Default
    @Column(name = "untref_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal untrefAmount = BigDecimal.ZERO;

    @Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "directors_distribution", columnDefinition = "jsonb", nullable = false)
    private List<DirectorDistribution> directorsDistribution = new ArrayList<>();

    @Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SettlementStatus status = SettlementStatus.DRAFT;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "created_by", updatable = false)
    private UUID createdBy;
}
