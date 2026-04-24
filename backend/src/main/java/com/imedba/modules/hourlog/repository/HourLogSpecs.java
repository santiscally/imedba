package com.imedba.modules.hourlog.repository;

import com.imedba.modules.hourlog.entity.HourLog;
import com.imedba.modules.hourlog.entity.PaymentStatus;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public final class HourLogSpecs {

    private HourLogSpecs() {}

    public static Specification<HourLog> byStaff(UUID staffId) {
        if (staffId == null) return null;
        return (root, q, cb) -> cb.equal(root.get("staff").get("id"), staffId);
    }

    public static Specification<HourLog> byPeriod(Integer year, Integer month) {
        if (year == null && month == null) return null;
        return (root, q, cb) -> {
            if (year != null && month != null) {
                return cb.and(
                        cb.equal(root.get("periodYear"), year),
                        cb.equal(root.get("periodMonth"), month));
            } else if (year != null) {
                return cb.equal(root.get("periodYear"), year);
            }
            return cb.equal(root.get("periodMonth"), month);
        };
    }

    public static Specification<HourLog> byStatus(PaymentStatus status) {
        if (status == null) return null;
        return (root, q, cb) -> cb.equal(root.get("paymentStatus"), status);
    }

    public static Specification<HourLog> byActivity(String activityType) {
        if (activityType == null || activityType.isBlank()) return null;
        return (root, q, cb) -> cb.equal(root.get("activityType"), activityType);
    }
}
