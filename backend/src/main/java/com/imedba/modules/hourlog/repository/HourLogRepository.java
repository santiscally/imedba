package com.imedba.modules.hourlog.repository;

import com.imedba.modules.hourlog.entity.HourLog;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HourLogRepository extends JpaRepository<HourLog, UUID>,
        JpaSpecificationExecutor<HourLog> {

    List<HourLog> findByStaffIdOrderByPeriodYearDescPeriodMonthDescCreatedAtDesc(UUID staffId);

    @Query("""
            select coalesce(sum(h.totalAmount), 0)
            from HourLog h
            where h.staff.id = :staffId
              and h.periodYear = :year
              and h.periodMonth = :month
            """)
    BigDecimal sumForStaffPeriod(@Param("staffId") UUID staffId,
                                 @Param("year") int year,
                                 @Param("month") int month);
}
