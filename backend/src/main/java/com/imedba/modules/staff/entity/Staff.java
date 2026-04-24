package com.imedba.modules.staff.entity;

import com.imedba.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
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

    @Default
    @Column(name = "is_active", nullable = false)
    private Boolean active = Boolean.TRUE;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
