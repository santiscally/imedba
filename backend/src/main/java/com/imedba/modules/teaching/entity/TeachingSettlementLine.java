package com.imedba.modules.teaching.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
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

/**
 * Una clase dentro de una liquidación docente. Los datos van snapshoteados: la
 * línea tiene que seguir leyéndose igual aunque después editen o borren la clase.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "teaching_settlement_lines")
@EntityListeners(AuditingEntityListener.class)
public class TeachingSettlementLine {

    @Id
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "settlement_id", nullable = false)
    private TeachingSettlement settlement;

    @Column(name = "class_session_id", nullable = false)
    private UUID classSessionId;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(name = "commission", length = 100)
    private String commission;

    @Column(name = "subject", length = 200)
    private String subject;

    @Column(name = "class_label", length = 300)
    private String classLabel;

    @Column(name = "hours_paid", nullable = false, precision = 6, scale = 2)
    private BigDecimal hoursPaid;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
