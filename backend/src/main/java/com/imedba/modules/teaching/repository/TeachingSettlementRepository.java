package com.imedba.modules.teaching.repository;

import com.imedba.modules.teaching.entity.TeachingRole;
import com.imedba.modules.teaching.entity.TeachingSettlement;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TeachingSettlementRepository extends JpaRepository<TeachingSettlement, UUID> {

    Optional<TeachingSettlement> findByStaffIdAndPeriodYearAndPeriodMonthAndRole(
            UUID staffId, Integer periodYear, Integer periodMonth, TeachingRole role);

    List<TeachingSettlement> findByPeriodYearAndPeriodMonthOrderByStaffNameAsc(
            Integer periodYear, Integer periodMonth);

    List<TeachingSettlement> findByStaffIdOrderByPeriodYearDescPeriodMonthDesc(UUID staffId);
}
