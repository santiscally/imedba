package com.imedba.modules.enrollment.entity;

import com.imedba.common.entity.BaseEntity;
import com.imedba.common.enums.PaymentMethod;
import com.imedba.modules.course.entity.Course;
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
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Builder.Default;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "enrollments")
@SQLDelete(sql = "UPDATE enrollments SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class Enrollment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    /** FK a discount_campaigns — la entidad/módulo llega en Fase 2, acá sólo guardamos el id. */
    @Column(name = "discount_campaign_id")
    private UUID discountCampaignId;

    /** sub del JWT de la vendedora que cargó la inscripción. */
    @Column(name = "enrolled_by")
    private UUID enrolledBy;

    @Column(name = "enrollment_date", nullable = false)
    private Instant enrollmentDate;

    @Column(name = "list_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal listPrice;

    @Default
    @Column(name = "discount_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPercentage = BigDecimal.ZERO;

    @Column(name = "final_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal finalPrice;

    @Default
    @Column(name = "book_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal bookPrice = BigDecimal.ZERO;

    @Column(name = "total_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalPrice;

    @Column(name = "enrollment_fee", precision = 12, scale = 2)
    private BigDecimal enrollmentFee;

    @Default
    @Column(name = "num_installments", nullable = false)
    private Integer numInstallments = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 30)
    private PaymentMethod paymentMethod;

    @Column(name = "contract_file_path", length = 500)
    private String contractFilePath;

    @Column(name = "contract_sent_at")
    private Instant contractSentAt;

    @Column(name = "contract_signed_at")
    private Instant contractSignedAt;

    @Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private EnrollmentStatus status = EnrollmentStatus.ACTIVE;

    @Column(name = "moodle_status", length = 20)
    private String moodleStatus;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;
}
