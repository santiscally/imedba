package com.imedba.modules.salescommission.repository;

import com.imedba.modules.salescommission.entity.SalesCommissionSettlement;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SalesCommissionSettlementRepository
        extends JpaRepository<SalesCommissionSettlement, UUID> {

    Optional<SalesCommissionSettlement> findBySellerUserIdAndPeriodYearAndPeriodMonth(
            UUID sellerUserId, Integer periodYear, Integer periodMonth);

    List<SalesCommissionSettlement> findBySellerUserIdOrderByPeriodYearDescPeriodMonthDesc(
            UUID sellerUserId);

    List<SalesCommissionSettlement> findByPeriodYearAndPeriodMonth(
            Integer periodYear, Integer periodMonth);
}
