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

    @Default
    @Column(name = "tax_commission_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal taxCommissionAmount = BigDecimal.ZERO;

    @Default
    @Column(name = "secretary_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal secretaryAmount = BigDecimal.ZERO;

    @Default
    @Column(name = "advertising_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal advertisingAmount = BigDecimal.ZERO;

    @Default
    @Column(name = "admin_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal adminAmount = BigDecimal.ZERO;

    @Default
    @Column(name = "university_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal universityAmount = BigDecimal.ZERO;

    @Default
    @Column(name = "imedba_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal imedbaAmount = BigDecimal.ZERO;

    @Default
    @Column(name = "partners_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal partnersTotal = BigDecimal.ZERO;

    @Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "partners_distribution", columnDefinition = "jsonb", nullable = false)
    private List<PartnerDistribution> partnersDistribution = new ArrayList<>();

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
