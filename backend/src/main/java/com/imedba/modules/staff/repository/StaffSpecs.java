package com.imedba.modules.staff.repository;

import com.imedba.modules.staff.entity.Staff;
import com.imedba.modules.staff.entity.StaffType;
import org.springframework.data.jpa.domain.Specification;

public final class StaffSpecs {

    private StaffSpecs() {}

    public static Specification<Staff> byType(StaffType type) {
        if (type == null) return null;
        return (root, q, cb) -> cb.equal(root.get("staffType"), type);
    }

    public static Specification<Staff> isActive(Boolean active) {
        if (active == null) return null;
        return (root, q, cb) -> cb.equal(root.get("active"), active);
    }

    public static Specification<Staff> textMatches(String query) {
        if (query == null || query.isBlank()) return null;
        String like = "%" + query.toLowerCase() + "%";
        return (root, q, cb) -> cb.or(
                cb.like(cb.lower(root.get("firstName")), like),
                cb.like(cb.lower(root.get("lastName")), like),
                cb.like(cb.lower(root.get("email")), like)
        );
    }
}
