package com.imedba.modules.diplomasettlement.repository;

import com.imedba.modules.diplomasettlement.entity.DiplomaSettlement;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiplomaSettlementRepository extends JpaRepository<DiplomaSettlement, UUID> {

    Optional<DiplomaSettlement> findByDiplomaIdAndPeriodYearAndPeriodMonth(
            UUID diplomaId, int periodYear, int periodMonth);

    List<DiplomaSettlement> findByDiplomaIdOrderByPeriodYearDescPeriodMonthDesc(UUID diplomaId);
}
