package com.imedba.modules.budget.repository;

import com.imedba.modules.budget.entity.BudgetEntry;
import com.imedba.modules.budget.entity.EntryType;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BudgetEntryRepository extends JpaRepository<BudgetEntry, UUID>,
        JpaSpecificationExecutor<BudgetEntry> {

    boolean existsByPaymentId(UUID paymentId);

    boolean existsByBookSaleId(UUID bookSaleId);

    @Query("""
            select coalesce(sum(b.amount), 0)
            from BudgetEntry b
            where b.entryType = :type
              and b.projected = :projected
              and b.periodYear = :year
              and b.periodMonth = :month
            """)
    BigDecimal sumByPeriod(@Param("type") EntryType type,
                           @Param("projected") boolean projected,
                           @Param("year") int year,
                           @Param("month") int month);

    @Query("""
            select new com.imedba.modules.budget.repository.BudgetAggregate(
                b.category, b.businessUnit, sum(b.amount))
            from BudgetEntry b
            where b.entryType = :type
              and b.periodYear = :year
              and b.periodMonth = :month
              and b.projected = false
            group by b.category, b.businessUnit
            """)
    List<BudgetAggregate> breakdown(@Param("type") EntryType type,
                                    @Param("year") int year,
                                    @Param("month") int month);

    @Query("""
            select new com.imedba.modules.budget.repository.PeriodTotals(
                b.periodYear, b.periodMonth, b.entryType, sum(b.amount))
            from BudgetEntry b
            where b.periodYear = :year
              and b.projected = :projected
            group by b.periodYear, b.periodMonth, b.entryType
            """)
    List<PeriodTotals> yearlyTotals(@Param("year") int year,
                                    @Param("projected") boolean projected);
}
