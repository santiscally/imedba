package com.imedba.modules.activitytype.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "activity_types")
public class ActivityType {

    @Id
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "name", nullable = false, length = 100, unique = true)
    private String name;

    @Column(name = "rate_per_hour", nullable = false, precision = 12, scale = 2)
    private BigDecimal ratePerHour;

    @Default
    @Enumerated(EnumType.STRING)
    @Column(name = "applies_to", nullable = false, length = 20)
    private AppliesTo appliesTo = AppliesTo.ALL;

    @Default
    @Column(name = "is_active", nullable = false)
    private Boolean active = Boolean.TRUE;
}
