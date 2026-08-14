package com.imedba.modules.installment.service;

import com.imedba.common.auth.AuthUtils;
import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.common.security.SegmentationFilter;
import com.imedba.modules.course.entity.Course;
import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.enrollment.entity.PaymentGroup;
import com.imedba.modules.installment.dto.DebtorResponse;
import com.imedba.modules.installment.dto.InstallmentResponse;
import com.imedba.modules.installment.dto.InstallmentUpdateRequest;
import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import com.imedba.modules.installment.mapper.InstallmentMapper;
import com.imedba.modules.installment.repository.InstallmentRepository;
import com.imedba.modules.installment.repository.InstallmentSpecs;
import com.imedba.modules.student.entity.Student;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InstallmentService {

    /**
     * Recargo por mora: 5% sobre el amount, a partir del día SIGUIENTE al vencimiento
     * (reunión 2026-06-05, modelo "día del mes"): el vencimiento es el último día sin recargo
     * (día 10 para GROUP_1, día 20 para GROUP_2), así que el recargo corre al día siguiente
     * (día 11 / día 21). El umbral queda baked en el dueDate de cada cuota (ver PaymentGroup).
     */
    public static final BigDecimal SURCHARGE_PCT = new BigDecimal("0.05");
    public static final int SURCHARGE_GRACE_DAYS = 1;

    private final InstallmentRepository repository;
    private final InstallmentMapper mapper;

    @Transactional(readOnly = true)
    public Page<InstallmentResponse> list(
            String q, UUID enrollmentId, UUID courseId, InstallmentStatus status,
            LocalDate from, LocalDate to, Pageable pageable) {
        Specification<Installment> spec = Specification
                .where(InstallmentSpecs.matchesText(q))
                .and(InstallmentSpecs.byEnrollment(enrollmentId))
                .and(InstallmentSpecs.byCourse(courseId))
                .and(InstallmentSpecs.byStatus(status))
                .and(InstallmentSpecs.dueFrom(from))
                .and(InstallmentSpecs.dueTo(to))
                .and(InstallmentSpecs.byBusinessUnits(SegmentationFilter.allowedBusinessUnits()))
                .and(vendedoraScope());
        return repository.findAll(spec, pageable).map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<InstallmentResponse> listByEnrollment(UUID enrollmentId) {
        return repository.findByEnrollmentIdOrderByNumberAsc(enrollmentId).stream()
                .map(mapper::toResponse)
                .toList();
    }

    /**
     * Deudores agrupados por inscripción: cada alumno con sus cuotas impagas
     * (PENDING/OVERDUE) juntas, ordenados por vencimiento más próximo. Paginado por
     * deudor (no por cuota). Reunión 2026-06-05 — vista "agrupar pendientes por alumno".
     *
     * <p>Agrupa en memoria: el universo de cuotas impagas de IMEDBA es chico, así que
     * traemos las filtradas y las agrupamos acá (evita SQL de GROUP BY + paginación
     * anidada). Respeta búsqueda, curso, rango de vencimiento, segmentación y vendedora.</p>
     */
    @Transactional(readOnly = true)
    public Page<DebtorResponse> debtors(
            String q, UUID courseId, PaymentGroup group, LocalDate from, LocalDate to, Pageable pageable) {
        Specification<Installment> spec = Specification
                .where(InstallmentSpecs.matchesText(q))
                .and(InstallmentSpecs.byCourse(courseId))
                .and(InstallmentSpecs.byPaymentGroup(group))
                .and(InstallmentSpecs.notPaid())
                .and(InstallmentSpecs.dueFrom(from))
                .and(InstallmentSpecs.dueTo(to))
                .and(InstallmentSpecs.byBusinessUnits(SegmentationFilter.allowedBusinessUnits()))
                .and(vendedoraScope());
        List<Installment> all = repository.findAll(spec, Sort.by(Sort.Direction.ASC, "dueDate"));

        LinkedHashMap<UUID, List<Installment>> byEnrollment = new LinkedHashMap<>();
        for (Installment i : all) {
            byEnrollment.computeIfAbsent(i.getEnrollment().getId(), k -> new ArrayList<>()).add(i);
        }

        List<DebtorResponse> debtors = byEnrollment.values().stream()
                .map(this::toDebtor)
                .sorted(Comparator.comparing(DebtorResponse::nextDueDate,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        int total = debtors.size();
        int fromIdx = (int) Math.min(pageable.getOffset(), total);
        int toIdx = Math.min(fromIdx + pageable.getPageSize(), total);
        return new PageImpl<>(debtors.subList(fromIdx, toIdx), pageable, total);
    }

    private DebtorResponse toDebtor(List<Installment> items) {
        Enrollment e = items.get(0).getEnrollment();
        Student s = e.getStudent();
        Course c = e.getCourse();
        BigDecimal totalOwed = items.stream()
                .map(Installment::totalDue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDate nextDue = items.stream()
                .map(Installment::getDueDate)
                .min(Comparator.naturalOrder())
                .orElse(null);
        List<InstallmentResponse> resp = items.stream()
                .sorted(Comparator.comparing(Installment::getNumber))
                .map(mapper::toResponse)
                .toList();
        return new DebtorResponse(
                e.getId(), s.getId(), s.getLastName() + ", " + s.getFirstName(), s.getPhone(),
                c.getId(), c.getName(), c.getCode(), e.getPaymentGroup(),
                nextDue, totalOwed, items.size(), resp);
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
        if (req.notes() != null) i.setNotes(req.notes());
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
            UUID me = AuthUtils.requireCurrentUserId();
            Enrollment e = i.getEnrollment();
            if (e == null || !Objects.equals(me, e.getEnrolledBy())) {
                throw NotFoundException.of("Installment", id);
            }
        }
        return i;
    }

    private Specification<Installment> vendedoraScope() {
        if (!AuthUtils.isVendedoraOnly()) return null;
        UUID me = AuthUtils.requireCurrentUserId();
        return InstallmentSpecs.byEnrolledBy(me);
    }
}
