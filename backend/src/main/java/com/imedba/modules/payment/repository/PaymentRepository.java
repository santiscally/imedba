package com.imedba.modules.payment.repository;

import com.imedba.modules.payment.entity.Payment;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository
        extends JpaRepository<Payment, UUID>, JpaSpecificationExecutor<Payment> {

    List<Payment> findByEnrollmentIdOrderByPaymentDateDesc(UUID enrollmentId);

    List<Payment> findByInstallmentIdOrderByPaymentDateAsc(UUID installmentId);

    Optional<Payment> findByReceiptNumber(String receiptNumber);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.installment.id = :installmentId")
    BigDecimal sumByInstallment(@Param("installmentId") UUID installmentId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.enrollment.id = :enrollmentId")
    BigDecimal sumByEnrollment(@Param("enrollmentId") UUID enrollmentId);
}
