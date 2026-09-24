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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
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

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Comisiones (V044): cursos FS a los que se inscriben los alumnos; la liquidación suma los pagos de todas. */
    @Default
    @OneToMany(mappedBy = "diploma", fetch = FetchType.LAZY)
    @OrderBy("commission DESC")
    private List<Course> commissions = new ArrayList<>();

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
