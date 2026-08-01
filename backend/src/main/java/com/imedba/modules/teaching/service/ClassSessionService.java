package com.imedba.modules.teaching.service;

import com.imedba.common.auth.AuthUtils;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.staff.entity.Staff;
import com.imedba.modules.staff.repository.StaffRepository;
import com.imedba.modules.teaching.dto.TeachingDtos.ClassSessionRequest;
import com.imedba.modules.teaching.dto.TeachingDtos.ClassSessionResponse;
import com.imedba.modules.teaching.dto.TeachingDtos.HoursToPayRequest;
import com.imedba.modules.teaching.entity.ClassSession;
import com.imedba.modules.teaching.mapper.TeachingMapper;
import com.imedba.modules.teaching.repository.ClassSessionRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Grilla de clases dictadas (V037). La carga la secretaría; Cobranzas confirma
 * las horas a pagar antes de liquidar.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ClassSessionService {

    private final ClassSessionRepository repository;
    private final StaffRepository staffRepository;
    private final TeachingMapper mapper;

    @Transactional(readOnly = true)
    public Page<ClassSessionResponse> list(
            Integer year, Integer month, UUID teacherId, UUID preceptorId,
            Boolean synchronous, String commission, Pageable pageable) {

        Specification<ClassSession> spec = (root, q, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (year != null && month != null) {
                YearMonth ym = YearMonth.of(year, month);
                ps.add(cb.greaterThanOrEqualTo(root.get("sessionDate"), ym.atDay(1)));
                ps.add(cb.lessThan(root.get("sessionDate"), ym.plusMonths(1).atDay(1)));
            }
            if (teacherId != null)   ps.add(cb.equal(root.get("teacher").get("id"), teacherId));
            if (preceptorId != null) ps.add(cb.equal(root.get("preceptor").get("id"), preceptorId));
            if (synchronous != null) ps.add(cb.equal(root.get("synchronous"), synchronous));
            if (commission != null && !commission.isBlank()) {
                ps.add(cb.like(cb.lower(root.get("commission")),
                        "%" + commission.toLowerCase() + "%"));
            }
            return ps.isEmpty() ? null : cb.and(ps.toArray(new Predicate[0]));
        };
        return repository.findAll(spec, pageable).map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public ClassSessionResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    public ClassSessionResponse create(ClassSessionRequest req) {
        ClassSession c = ClassSession.builder()
                .sessionDate(req.sessionDate())
                .commission(req.commission())
                .subject(req.subject())
                .classLabel(req.classLabel())
                .synchronous(req.synchronous() == null ? Boolean.TRUE : req.synchronous())
                .scheduledTime(req.scheduledTime())
                .zoomAccount(req.zoomAccount())
                .sessionLink(req.sessionLink())
                .teacher(staffOrNull(req.teacherId()))
                .preceptor(staffOrNull(req.preceptorId()))
                .actualHours(req.actualHours())
                .hoursToPay(req.hoursToPay())
                .notes(req.notes())
                .build();
        c.setCreatedBy(AuthUtils.currentUserId().orElse(null));
        return mapper.toResponse(repository.save(c));
    }

    public ClassSessionResponse update(UUID id, ClassSessionRequest req) {
        ClassSession c = find(id);
        if (req.sessionDate() != null)  c.setSessionDate(req.sessionDate());
        if (req.commission() != null)   c.setCommission(req.commission());
        if (req.subject() != null)      c.setSubject(req.subject());
        if (req.classLabel() != null)   c.setClassLabel(req.classLabel());
        if (req.synchronous() != null)  c.setSynchronous(req.synchronous());
        if (req.scheduledTime() != null) c.setScheduledTime(req.scheduledTime());
        if (req.zoomAccount() != null)  c.setZoomAccount(req.zoomAccount());
        if (req.sessionLink() != null)  c.setSessionLink(req.sessionLink());
        if (req.actualHours() != null)  c.setActualHours(req.actualHours());
        if (req.hoursToPay() != null)   c.setHoursToPay(req.hoursToPay());
        if (req.notes() != null)        c.setNotes(req.notes());
        // Docente y preceptora se pueden reasignar y también DESASIGNAR: un id
        // distinto la cambia; para sacarla hay que usar el endpoint de baja o
        // mandar el mismo id. Se aplican sólo si vienen para no pisarlas con null
        // en un update parcial.
        if (req.teacherId() != null)   c.setTeacher(staffOrNull(req.teacherId()));
        if (req.preceptorId() != null) c.setPreceptor(staffOrNull(req.preceptorId()));
        return mapper.toResponse(c);
    }

    /**
     * Carga masiva de horas a pagar. Es lo que hace Cobranzas al cerrar el mes:
     * repasa la grilla y confirma cuánto se le paga por cada clase.
     */
    public int setHoursToPay(List<HoursToPayRequest> items) {
        if (items == null || items.isEmpty()) return 0;
        int updated = 0;
        for (HoursToPayRequest item : items) {
            ClassSession c = find(item.sessionId());
            c.setHoursToPay(item.hoursToPay());
            updated++;
        }
        return updated;
    }

    public void delete(UUID id) {
        repository.delete(find(id));   // soft delete vía @SQLDelete
    }

    private Staff staffOrNull(UUID id) {
        if (id == null) return null;
        return staffRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Staff", id));
    }

    private ClassSession find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("ClassSession", id));
    }

    /** Primer día del mes — helper para los llamadores que arman rangos. */
    public static LocalDate startOf(int year, int month) {
        return YearMonth.of(year, month).atDay(1);
    }
}
