package com.imedba.modules.installment.repository;

import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InstallmentRepository
        extends JpaRepository<Installment, UUID>, JpaSpecificationExecutor<Installment> {

    List<Installment> findByEnrollmentIdOrderByNumberAsc(UUID enrollmentId);

    /**
     * Cuotas vencidas sin recargo aplicado aún (status = PENDING y due_date en el pasado).
     * El scheduler de recargos las toma en lotes.
     */
    @Query("""
           SELECT i FROM Installment i
            WHERE i.status = com.imedba.modules.installment.entity.InstallmentStatus.PENDING
              AND i.dueDate < :today
           """)
    List<Installment> findOverduePending(@Param("today") LocalDate today);

    /**
     * Cuotas OVERDUE con vencimiento entre [from, to] — usado por el scheduler de suspensión
     * para detectar inscripciones que deben pasar a SUSPENDED (día 22 desde due_date).
     */
    @Query("""
           SELECT i FROM Installment i
            WHERE i.status = com.imedba.modules.installment.entity.InstallmentStatus.OVERDUE
              AND i.dueDate BETWEEN :from AND :to
           """)
    List<Installment> findOverdueBetween(
            @Param("from") LocalDate from, @Param("to") LocalDate to);

    long countByEnrollmentIdAndStatus(UUID enrollmentId, InstallmentStatus status);
}
