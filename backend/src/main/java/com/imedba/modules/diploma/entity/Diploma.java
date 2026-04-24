package com.imedba.modules.diploma.entity;

import com.imedba.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;

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

    @Column(name = "enrollment_price", precision = 12, scale = 2)
    private BigDecimal enrollmentPrice;

    @Column(name = "course_price", precision = 12, scale = 2)
    private BigDecimal coursePrice;

    @Column(name = "tax_commission_pct", precision = 5, scale = 2)
    private BigDecimal taxCommissionPct;

    @Column(name = "secretary_salary", precision = 12, scale = 2)
    private BigDecimal secretarySalary;

    @Column(name = "advertising_amount", precision = 12, scale = 2)
    private BigDecimal advertisingAmount;

    @Column(name = "admin_pct", precision = 5, scale = 2)
    private BigDecimal adminPct;

    @Column(name = "university_pct", precision = 5, scale = 2)
    private BigDecimal universityPct;

    @Column(name = "imedba_pct", precision = 5, scale = 2)
    private BigDecimal imedbaPct;

    @Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "partners_config", columnDefinition = "jsonb", nullable = false)
    private List<PartnerConfig> partnersConfig = new ArrayList<>();

    @Default
    @Column(name = "is_active", nullable = false)
    private Boolean active = Boolean.TRUE;
}
