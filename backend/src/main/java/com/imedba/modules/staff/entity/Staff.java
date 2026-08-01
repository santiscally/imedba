package com.imedba.modules.staff.entity;

import com.imedba.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
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
@Table(name = "staff")
@SQLDelete(sql = "UPDATE staff SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class Staff extends BaseEntity {

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "phone", length = 50)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "staff_type", nullable = false, length = 20)
    private StaffType staffType;

    // ─── Personal Académico (V034) ───────────────────────────────────────────

    @Column(name = "dni", length = 20)
    private String dni;

    /** Materia/s que da. Texto libre — es un dato de contacto, no un plan de estudios. */
    @Column(name = "subject", length = 200)
    private String subject;

    @Enumerated(EnumType.STRING)
    @Column(name = "segment", length = 30)
    private StaffSegment segment;

    /** false = cobra sueldo fijo y queda fuera de la liquidación por horas. */
    @Default
    @Column(name = "paid_by_hours", nullable = false)
    private Boolean paidByHours = Boolean.TRUE;

    /**
     * Además de su rol hace seguimiento de alumnos (V036). No es un rol aparte:
     * «las tutoras son docentes que también hacen la parte de seguimiento» (Nico,
     * 2026-07-30). El seguimiento en sí queda para más adelante, junto con las
     * alertas de pago; por ahora es sólo un dato del listado.
     */
    @Default
    @Column(name = "is_tutor", nullable = false)
    private Boolean tutor = Boolean.FALSE;

    /** Override individual del valor hora. NULL = usar el del tipo de actividad. */
    @Column(name = "hourly_rate", precision = 12, scale = 2)
    private BigDecimal hourlyRate;

    @Default
    @Column(name = "is_active", nullable = false)
    private Boolean active = Boolean.TRUE;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
