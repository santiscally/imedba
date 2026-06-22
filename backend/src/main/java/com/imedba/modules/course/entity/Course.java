package com.imedba.modules.course.entity;

import com.imedba.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Entity;
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
@Table(name = "courses")
@SQLDelete(sql = "UPDATE courses SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class Course extends BaseEntity {

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "code", length = 50)
    private String code;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "business_unit", nullable = false, length = 50)
    private BusinessUnit businessUnit;

    @Column(name = "modality", length = 50)
    private String modality;

    /** ISO 3166-1 alpha-2. Fase 9.a (V015): default 'AR'. */
    @Default
    @Column(name = "country", nullable = false, length = 2)
    private String country = "AR";

    @Column(name = "enrollment_price", precision = 12, scale = 2)
    private BigDecimal enrollmentPrice;

    @Column(name = "course_price", precision = 12, scale = 2)
    private BigDecimal coursePrice;

    @Column(name = "exam_date")
    private LocalDate examDate;

    /**
     * Ciclo lectivo / año del curso (ej. 2026). Nullable: los cursos "libres" (el
     * básico de Residencias) no llevan año. Reunión 2026-06-05 §3.7: agrupar por ciclo.
     */
    @Column(name = "academic_year")
    private Integer academicYear;

    /**
     * Nro de comisión, sólo para Formación Superior (reunión 2026-06-12). Las comisiones
     * son secuenciales cada 6 meses (la 10 es la actual, la 11 arranca ago-2026); el año
     * va en {@link #academicYear}. Para Residencias queda null.
     */
    @Column(name = "commission")
    private Integer commission;

    @Column(name = "contract_template_path", length = 500)
    private String contractTemplatePath;

    @Column(name = "moodle_course_id")
    private Integer moodleCourseId;

    @Default
    @Column(name = "is_active", nullable = false)
    private Boolean active = Boolean.TRUE;
}
