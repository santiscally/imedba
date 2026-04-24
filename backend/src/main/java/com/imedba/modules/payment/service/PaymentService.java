package com.imedba.modules.payment.service;

import com.imedba.common.auth.AuthUtils;
import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.common.enums.PaymentMethod;
import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.enrollment.repository.EnrollmentRepository;
import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import com.imedba.modules.installment.service.InstallmentService;
import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.entity.RelatedEntityType;
import com.imedba.modules.notification.service.NotificationService;
import com.imedba.modules.notification.template.NotificationTemplate;
import com.imedba.modules.notification.template.NotificationTemplates;
import com.imedba.modules.budget.service.BudgetService;
import com.imedba.modules.payment.dto.PaymentCreateRequest;
import com.imedba.modules.payment.dto.PaymentResponse;
import com.imedba.modules.payment.entity.Payment;
import com.imedba.modules.payment.mapper.PaymentMapper;
import com.imedba.modules.payment.repository.PaymentRepository;
import com.imedba.modules.payment.repository.PaymentSpecs;
import com.imedba.modules.student.entity.Student;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentService {

    private final PaymentRepository repository;
    private final EnrollmentRepository enrollmentRepository;
    private final InstallmentService installmentService;
    private final ReceiptNumberGenerator receiptGenerator;
    private final NotificationService notificationService;
    private final BudgetService budgetService;
    private final PaymentMapper mapper;

    @Transactional(readOnly = true)
    public Page<PaymentResponse> list(
            UUID enrollmentId, UUID installmentId, PaymentMethod method,
            Instant from, Instant to, Pageable pageable) {
        Specification<Payment> spec = Specification
                .where(PaymentSpecs.byEnrollment(enrollmentId))
                .and(PaymentSpecs.byInstallment(installmentId))
                .and(PaymentSpecs.byMethod(method))
                .and(PaymentSpecs.dateFrom(from))
                .and(PaymentSpecs.dateTo(to))
                .and(vendedoraScope());
        return repository.findAll(spec, pageable).map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> listByEnrollment(UUID enrollmentId) {
        return repository.findByEnrollmentIdOrderByPaymentDateDesc(enrollmentId).stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PaymentResponse get(UUID id) {
        return mapper.toResponse(findVisible(id));
    }

    public PaymentResponse register(PaymentCreateRequest req) {
        Installment installment = null;
        Enrollment enrollment;

        if (req.installmentId() != null) {
            installment = installmentService.findById(req.installmentId());
            if (installment.getStatus() == InstallmentStatus.PAID) {
                throw new ConflictException(
                        "La cuota ya fue pagada: " + installment.getId());
            }
            enrollment = installment.getEnrollment();
            if (req.enrollmentId() != null && !Objects.equals(req.enrollmentId(), enrollment.getId())) {
                throw new ConflictException("enrollmentId no coincide con el de la cuota");
            }
        } else {
            if (req.enrollmentId() == null) {
                throw new ConflictException("Se requiere installmentId o enrollmentId");
            }
            enrollment = enrollmentRepository.findById(req.enrollmentId())
                    .orElseThrow(() -> NotFoundException.of("Enrollment", req.enrollmentId()));
        }

        Instant paymentDate = req.paymentDate() != null ? req.paymentDate() : Instant.now();

        Payment payment = Payment.builder()
                .installment(installment)
                .enrollment(enrollment)
                .amount(req.amount())
                .paymentMethod(req.paymentMethod())
                .paymentDate(paymentDate)
                .referenceNumber(req.referenceNumber())
                .receiptNumber(receiptGenerator.generate())
                .receiptFilePath(req.receiptFilePath())
                .notes(req.notes())
                .registeredBy(AuthUtils.currentUserId().orElse(null))
                .build();
        payment = repository.save(payment);

        if (installment != null) {
            closeInstallmentIfFullyPaid(installment, paymentDate);
        }

        enqueueReceiptNotification(payment);
        budgetService.linkFromPayment(payment);

        return mapper.toResponse(payment);
    }

    private void enqueueReceiptNotification(Payment payment) {
        Enrollment e = payment.getEnrollment();
        if (e == null) return;
        Student s = e.getStudent();
        if (s == null || s.getEmail() == null || s.getEmail().isBlank()) return;
        String firstName = s.getFirstName() != null ? s.getFirstName() : "";
        String courseName = e.getCourse() != null ? e.getCourse().getName() : "";
        NotificationTemplate tpl = NotificationTemplates.paymentReceipt(
                firstName, payment.getReceiptNumber(), payment.getAmount(), courseName);
        notificationService.enqueue(
                NotificationType.PAYMENT_RECEIPT, s.getEmail(), tpl,
                RelatedEntityType.PAYMENT, payment.getId());
    }

    public PaymentResponse markReceiptSent(UUID id, Instant at) {
        Payment p = findVisible(id);
        p.setReceiptSentAt(at != null ? at : Instant.now());
        return mapper.toResponse(p);
    }

    // ------- helpers ----------

    private void closeInstallmentIfFullyPaid(Installment installment, Instant paymentDate) {
        BigDecimal paid = repository.sumByInstallment(installment.getId());
        if (paid.compareTo(installment.totalDue()) >= 0) {
            installmentService.markPaid(installment, paymentDate);
        }
    }

    private Payment findVisible(UUID id) {
        Payment p = repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Payment", id));
        if (AuthUtils.isVendedoraOnly()) {
            UUID me = AuthUtils.currentUserId().orElse(null);
            Enrollment e = p.getEnrollment();
            if (e == null || !Objects.equals(me, e.getEnrolledBy())) {
                throw NotFoundException.of("Payment", id);
            }
        }
        return p;
    }

    private Specification<Payment> vendedoraScope() {
        if (!AuthUtils.isVendedoraOnly()) return null;
        UUID me = AuthUtils.currentUserId().orElse(null);
        return PaymentSpecs.byEnrolledBy(me);
    }
}
