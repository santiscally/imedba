package com.imedba.modules.diplomaenrollment.entity;

import com.imedba.common.entity.BaseEntity;
import com.imedba.common.enums.PaymentMethod;
import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.student.entity.Student;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "diploma_enrollments")
@SQLDelete(sql = "UPDATE diploma_enrollments SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class DiplomaEnrollment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "diploma_id", nullable = false)
    private Diploma diploma;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "enrollment_date", nullable = false)
    private LocalDate enrollmentDate;

    @Default
    @Column(name = "num_installments", nullable = false)
    private Integer numInstallments = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 30)
    private PaymentMethod paymentMethod;

    @Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private DiplomaEnrollmentStatus status = DiplomaEnrollmentStatus.ACTIVE;

    @Default
    @Column(name = "pending_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal pendingAmount = BigDecimal.ZERO;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
