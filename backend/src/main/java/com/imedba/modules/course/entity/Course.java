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

    @Column(name = "enrollment_price", precision = 12, scale = 2)
    private BigDecimal enrollmentPrice;

    @Column(name = "course_price", precision = 12, scale = 2)
    private BigDecimal coursePrice;

    @Column(name = "exam_date")
    private LocalDate examDate;

    @Column(name = "contract_template_path", length = 500)
    private String contractTemplatePath;

    @Column(name = "moodle_course_id")
    private Integer moodleCourseId;

    @Default
    @Column(name = "is_active", nullable = false)
    private Boolean active = Boolean.TRUE;
}
