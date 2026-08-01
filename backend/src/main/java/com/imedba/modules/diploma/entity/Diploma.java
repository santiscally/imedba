package com.imedba.modules.diploma.entity;

import com.imedba.common.entity.BaseEntity;
import com.imedba.modules.course.entity.Course;
import com.imedba.modules.staff.entity.Staff;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
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
@Table(name = "diplomas")
@SQLDelete(sql = "UPDATE diplomas SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class Diploma extends BaseEntity {

    @Column(name = "name", nullable = false, length = 300)
    private String name;

    @Column(name = "university_name", length = 200)
    private String universityName;

    /**
     * Curso (unidad FS) por el que se inscriben los alumnos de esta diplomatura.
     * La inscripción/cuotas/pagos pasan por el flujo de cursos; la liquidación
     * suma los pagos del período de las inscripciones de este curso (V026).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "enrollment_price", precision = 12, scale = 2)
    private BigDecimal enrollmentPrice;

    @Column(name = "course_price", precision = 12, scale = 2)
    private BigDecimal coursePrice;

    /**
     * Directoras de la diplomatura, tomadas de Personal Académico (V035).
     *
     * <p><b>Sin porcentaje.</b> Antes se pedía un «% de directora» al crear la
     * diplomatura; el cliente lo bajó explícitamente el 2026-07-23 («eso habría que
     * sacarlo y que sólo pida cuántas directoras y quiénes»). Se reparten en partes
     * iguales la mitad del subtotal 2 menos las grabaciones.
     *
     * <p>Todos los costos y porcentajes de la liquidación viven en el settlement,
     * no acá (decisión 2026-05-22 §2.6).
     */
    @Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "diploma_directors",
            joinColumns = @JoinColumn(name = "diploma_id"),
            inverseJoinColumns = @JoinColumn(name = "staff_id"))
    private List<Staff> directors = new ArrayList<>();

    @Default
    @Column(name = "is_active", nullable = false)
    private Boolean active = Boolean.TRUE;
}
