package com.imedba.modules.installment.service;

import com.imedba.common.auth.AuthUtils;
import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.installment.dto.InstallmentResponse;
import com.imedba.modules.installment.dto.InstallmentUpdateRequest;
import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import com.imedba.modules.installment.mapper.InstallmentMapper;
import com.imedba.modules.installment.repository.InstallmentRepository;
import com.imedba.modules.installment.repository.InstallmentSpecs;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
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
public class InstallmentService {

    /** Recargo por mora: 5% sobre el amount, a partir del día 11 desde el vencimiento. */
    public static final BigDecimal SURCHARGE_PCT = new BigDecimal("0.05");
    public static final int SURCHARGE_GRACE_DAYS = 10;

    private final InstallmentRepository repository;
    private final InstallmentMapper mapper;

    @Transactional(readOnly = true)
    public Page<InstallmentResponse> list(
            UUID enrollmentId, InstallmentStatus status,
            LocalDate from, LocalDate to, Pageable pageable) {
        Specification<Installment> spec = Specification
                .where(InstallmentSpecs.byEnrollment(enrollmentId))
                .and(InstallmentSpecs.byStatus(status))
                .and(InstallmentSpecs.dueFrom(from))
                .and(InstallmentSpecs.dueTo(to))
                .and(vendedoraScope());
        return repository.findAll(spec, pageable).map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<InstallmentResponse> listByEnrollment(UUID enrollmentId) {
        return repository.findByEnrollmentIdOrderByNumberAsc(enrollmentId).stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public InstallmentResponse get(UUID id) {
        return mapper.toResponse(findVisible(id));
    }

    public InstallmentResponse update(UUID id, InstallmentUpdateRequest req) {
        Installment i = findVisible(id);
        if (i.getStatus() == InstallmentStatus.PAID) {
            throw new ConflictException("No se puede modificar una cuota pagada");
        }
        if (req.amount() != null) i.setAmount(req.amount());
        if (req.dueDate() != null) i.setDueDate(req.dueDate());
        return mapper.toResponse(i);
    }

    /** Condona el recargo (admin override). Deja surcharge_amount en 0 y vuelve status a PENDING si aplicaba. */
    public InstallmentResponse waiveSurcharge(UUID id) {
        Installment i = findVisible(id);
        if (i.getStatus() == InstallmentStatus.PAID) {
            throw new ConflictException("No se puede condonar recargo de una cuota pagada");
        }
        i.setSurchargeAmount(BigDecimal.ZERO);
        if (i.getStatus() == InstallmentStatus.OVERDUE) {
            i.setStatus(InstallmentStatus.PENDING);
        }
        return mapper.toResponse(i);
    }

    // ------- API usada por otros servicios (PaymentService, schedulers) ----------

    /**
     * Aplica recargo del 5% sobre {@code amount} a una cuota que pasó los días de gracia.
     * Idempotente: si ya tenía surcharge > 0 no lo vuelve a aplicar.
     */
    public Installment applySurcharge(Installment i) {
        if (i.getStatus() != InstallmentStatus.PENDING) return i;
        if (i.getSurchargeAmount().signum() > 0) return i;
        BigDecimal s = i.getAmount().multiply(SURCHARGE_PCT).setScale(2, RoundingMode.HALF_UP);
        i.setSurchargeAmount(s);
        i.setStatus(InstallmentStatus.OVERDUE);
        return i;
    }

    /** Marca cuota como PAID. Usado por PaymentService al confirmar un pago que cubre totalDue. */
    public Installment markPaid(Installment i, Instant at) {
        if (i.getStatus() == InstallmentStatus.PAID) return i;
        i.setStatus(InstallmentStatus.PAID);
        i.setPaidAt(at != null ? at : Instant.now());
        return i;
    }

    public Installment findById(UUID id) {
        return repository.findById(id).orElseThrow(() -> NotFoundException.of("Installment", id));
    }

    // ------- helpers ----------

    private Installment findVisible(UUID id) {
        Installment i = findById(id);
        if (AuthUtils.isVendedoraOnly()) {
            UUID me = AuthUtils.currentUserId().orElse(null);
            Enrollment e = i.getEnrollment();
            if (e == null || !Objects.equals(me, e.getEnrolledBy())) {
                throw NotFoundException.of("Installment", id);
            }
        }
        return i;
    }

    private Specification<Installment> vendedoraScope() {
        if (!AuthUtils.isVendedoraOnly()) return null;
        UUID me = AuthUtils.currentUserId().orElse(null);
        return InstallmentSpecs.byEnrolledBy(me);
    }
}
