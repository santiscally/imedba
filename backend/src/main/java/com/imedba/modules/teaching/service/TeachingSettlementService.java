package com.imedba.modules.teaching.service;

import com.imedba.common.auth.AuthUtils;
import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.activitytype.entity.ActivityType;
import com.imedba.modules.activitytype.repository.ActivityTypeRepository;
import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.entity.RelatedEntityType;
import com.imedba.modules.notification.service.NotificationService;
import com.imedba.modules.notification.template.NotificationTemplate;
import com.imedba.modules.notification.template.NotificationTemplates;
import com.imedba.modules.staff.entity.Staff;
import com.imedba.modules.staff.repository.StaffRepository;
import com.imedba.modules.teaching.dto.TeachingDtos.CreateRequest;
import com.imedba.modules.teaching.dto.TeachingDtos.Response;
import com.imedba.modules.teaching.dto.TeachingDtos.SummaryResponse;
import com.imedba.modules.teaching.dto.TeachingDtos.TeachingCandidate;
import com.imedba.modules.teaching.entity.ClassSession;
import com.imedba.modules.teaching.entity.TeachingRole;
import com.imedba.modules.teaching.entity.TeachingSettlement;
import com.imedba.modules.teaching.entity.TeachingSettlementLine;
import com.imedba.modules.teaching.entity.TeachingSettlementStatus;
import com.imedba.modules.teaching.mapper.TeachingMapper;
import com.imedba.modules.teaching.repository.ClassSessionRepository;
import com.imedba.modules.teaching.repository.TeachingSettlementRepository;
import com.imedba.modules.teaching.service.TeachingSettlementEngine.Result;
import com.imedba.modules.teaching.service.TeachingSettlementEngine.SessionInput;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Liquidación de horas docentes y de preceptoría (doc 17 §3.2).
 *
 * <p>Se deriva de la grilla de clases: nadie carga totales a mano. Cobranzas sólo
 * confirma las horas a pagar de cada clase y el resto sale solo.
 *
 * <p>Nombres de los valores hora en el catálogo de actividades: ver
 * {@link #RATE_DOCENTE} y {@link #RATE_PRECEPTORA}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class TeachingSettlementService {

    /** Nombres en `activity_types` (los crea V037). */
    public static final String RATE_DOCENTE = "Hora docente";
    public static final String RATE_PRECEPTORA = "Hora preceptora";

    private final TeachingSettlementRepository repository;
    private final ClassSessionRepository sessionRepository;
    private final StaffRepository staffRepository;
    private final ActivityTypeRepository activityTypeRepository;
    private final TeachingMapper mapper;
    private final NotificationService notificationService;

    // ─── Comandos ────────────────────────────────────────────────────────────

    public Response createDraft(CreateRequest req) {
        repository.findByStaffIdAndPeriodYearAndPeriodMonthAndRole(
                        req.staffId(), req.periodYear(), req.periodMonth(), req.role())
                .ifPresent(s -> {
                    throw new ConflictException("Ya existe una liquidación de "
                            + req.role() + " para " + req.periodYear() + "-" + req.periodMonth()
                            + " (id=" + s.getId() + ", status=" + s.getStatus() + ")");
                });

        Staff staff = findStaff(req.staffId());
        requirePaidByHours(staff);

        TeachingSettlement settlement = TeachingSettlement.builder()
                .staff(staff)
                .staffName(fullName(staff))
                .periodYear(req.periodYear())
                .periodMonth(req.periodMonth())
                .role(req.role())
                .hourlyRate(resolveRate(req.hourlyRate(), staff, req.role()))
                .status(TeachingSettlementStatus.DRAFT)
                .notes(req.notes())
                .createdBy(AuthUtils.currentUserId().orElse(null))
                .build();

        applyComputation(settlement);
        return mapper.toResponse(repository.save(settlement));
    }

    /** Recalcula un DRAFT: la secretaría pudo haber cargado clases nuevas u horas. */
    public Response recomputeDraft(UUID id) {
        TeachingSettlement s = find(id);
        if (s.getStatus() != TeachingSettlementStatus.DRAFT) {
            throw new ConflictException(
                    "Sólo se puede recalcular mientras está en DRAFT (actual: " + s.getStatus() + ")");
        }
        applyComputation(s);
        return mapper.toResponse(s);
    }

    public Response approve(UUID id) {
        TeachingSettlement s = find(id);
        if (s.getStatus() != TeachingSettlementStatus.DRAFT) {
            throw new ConflictException(
                    "Sólo se puede aprobar una liquidación en DRAFT (actual: " + s.getStatus() + ")");
        }
        s.setStatus(TeachingSettlementStatus.APPROVED);
        return mapper.toResponse(s);
    }

    /**
     * Le manda el mail pidiéndole la factura, con el detalle de clases del mes
     * (plantilla de Nico, 2026-07-31).
     *
     * <p>Si la persona no tiene email cargado se marca la fecha igual: el usuario
     * pudo haberlo mandado a mano, y bloquear el flujo por un dato de contacto
     * faltante sería peor que registrar el envío.
     */
    public Response markInvoiceSent(UUID id) {
        TeachingSettlement s = find(id);

        String email = s.getStaff() == null ? null : s.getStaff().getEmail();
        if (email != null && !email.isBlank()) {
            NotificationTemplate tpl = NotificationTemplates.teachingInvoiceRequest(
                    firstNameOf(s.getStaff()),
                    s.getLines().stream().map(TeachingSettlementService::describeLine).toList(),
                    s.getBillableHours(),
                    s.getTotalAmount());
            notificationService.enqueue(
                    NotificationType.TEACHING_INVOICE_REQUEST, email, tpl,
                    RelatedEntityType.TEACHING_SETTLEMENT, s.getId());
        } else {
            log.warn("Liquidación {} ({}): no se pudo mandar el pedido de factura, "
                    + "la persona no tiene email cargado", s.getId(), s.getStaffName());
        }

        s.setInvoiceEmailSentAt(Instant.now());
        return mapper.toResponse(s);
    }

    /**
     * Una línea del detalle, con el formato que Cobranzas escribe a mano:
     * {@code Clase 7/5: Medicina Interna CLIN 80 - Gastro - 2,5 hs}.
     *
     * <p>Las partes vacías se omiten para no dejar guiones sueltos: la planilla
     * tiene clases sin comisión o sin materia.
     */
    private static String describeLine(TeachingSettlementLine l) {
        StringBuilder sb = new StringBuilder("Clase ")
                .append(l.getSessionDate().getDayOfMonth())
                .append('/')
                .append(l.getSessionDate().getMonthValue())
                .append(": ");

        List<String> parts = new ArrayList<>();
        if (isSet(l.getSubject()))    parts.add(l.getSubject().trim());
        if (isSet(l.getCommission())) parts.add(l.getCommission().trim());
        if (isSet(l.getClassLabel())) parts.add(l.getClassLabel().trim());
        sb.append(parts.isEmpty() ? "clase" : String.join(" - ", parts));

        BigDecimal h = l.getHoursPaid() == null ? BigDecimal.ZERO : l.getHoursPaid();
        sb.append(" - ").append(h.stripTrailingZeros().toPlainString().replace('.', ','))
          .append(" hs");
        return sb.toString();
    }

    private static boolean isSet(String s) {
        return s != null && !s.isBlank();
    }

    private static String firstNameOf(Staff s) {
        return s == null ? "" : s.getFirstName();
    }

    public Response markInvoiceReceived(UUID id) {
        TeachingSettlement s = find(id);
        s.setInvoiceReceived(Boolean.TRUE);
        return mapper.toResponse(s);
    }

    public Response markPaid(UUID id) {
        TeachingSettlement s = find(id);
        if (s.getStatus() != TeachingSettlementStatus.APPROVED) {
            throw new ConflictException(
                    "Sólo se puede pagar una liquidación APPROVED (actual: " + s.getStatus() + ")");
        }
        // Mismo criterio que hour_logs: no se paga sin factura en mano.
        if (!Boolean.TRUE.equals(s.getInvoiceReceived())) {
            throw new ConflictException(
                    "No se puede marcar como pagada sin haber recibido la factura");
        }
        s.setStatus(TeachingSettlementStatus.PAID);
        s.setPaidAt(Instant.now());
        return mapper.toResponse(s);
    }

    // ─── Consultas ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Response get(UUID id) {
        return mapper.toResponse(find(id));
    }

    @Transactional(readOnly = true)
    public List<SummaryResponse> listByPeriod(int year, int month) {
        return repository.findByPeriodYearAndPeriodMonthOrderByStaffNameAsc(year, month)
                .stream().map(mapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public List<SummaryResponse> listByStaff(UUID staffId) {
        return repository.findByStaffIdOrderByPeriodYearDescPeriodMonthDesc(staffId)
                .stream().map(mapper::toSummary).toList();
    }

    /**
     * Quiénes tienen clases sincrónicas en el período, con el rol en el que
     * participaron y si ya se les liquidó.
     *
     * <p>Una misma persona puede aparecer dos veces (como docente y como
     * preceptora): son dos liquidaciones distintas, con distinto valor hora y
     * distinta fórmula.
     *
     * <p>Se incluyen las que cobran sueldo fijo, marcadas con {@code paidByHours =
     * false}: esconderlas haría que el usuario no entienda por qué falta alguien
     * que sí dio clases. El caso concreto es Ailen (Nico, 2026-07-30).
     */
    @Transactional(readOnly = true)
    public List<TeachingCandidate> candidates(int year, int month) {
        YearMonth period = YearMonth.of(year, month);
        LocalDate from = period.atDay(1);
        LocalDate to = period.plusMonths(1).atDay(1);

        List<TeachingCandidate> out = new ArrayList<>();
        collectCandidates(sessionRepository.findTeachersWithSessions(from, to),
                TeachingRole.DOCENTE, period, from, to, out);
        collectCandidates(sessionRepository.findPreceptorsWithSessions(from, to),
                TeachingRole.PRECEPTORA, period, from, to, out);
        out.sort((a, b) -> {
            int byName = String.valueOf(a.staffName()).compareToIgnoreCase(String.valueOf(b.staffName()));
            return byName != 0 ? byName : a.role().compareTo(b.role());
        });
        return out;
    }

    private void collectCandidates(
            List<UUID> staffIds, TeachingRole role, YearMonth period,
            LocalDate from, LocalDate to, List<TeachingCandidate> out) {
        for (UUID staffId : staffIds) {
            Staff staff = staffRepository.findById(staffId).orElse(null);
            if (staff == null) continue;
            int count = sessionsFor(staffId, role, from, to).size();
            boolean settled = repository.findByStaffIdAndPeriodYearAndPeriodMonthAndRole(
                    staffId, period.getYear(), period.getMonthValue(), role).isPresent();
            out.add(new TeachingCandidate(
                    staffId, fullName(staff), role, count,
                    !Boolean.FALSE.equals(staff.getPaidByHours()), settled));
        }
    }

    /** Calcula sin persistir: deja ver el número antes de generar el borrador. */
    @Transactional(readOnly = true)
    public Response preview(UUID staffId, TeachingRole role, int year, int month, BigDecimal rate) {
        Staff staff = findStaff(staffId);
        TeachingSettlement draft = TeachingSettlement.builder()
                .staff(staff)
                .staffName(fullName(staff))
                .periodYear(year)
                .periodMonth(month)
                .role(role)
                .hourlyRate(resolveRate(rate, staff, role))
                .status(TeachingSettlementStatus.DRAFT)
                .build();
        applyComputation(draft);
        return mapper.toResponse(draft);
    }

    // ─── Núcleo ──────────────────────────────────────────────────────────────

    private void applyComputation(TeachingSettlement s) {
        YearMonth period = YearMonth.of(s.getPeriodYear(), s.getPeriodMonth());
        LocalDate from = period.atDay(1);
        LocalDate to = period.plusMonths(1).atDay(1);

        List<ClassSession> sessions = sessionsFor(s.getStaff().getId(), s.getRole(), from, to);
        List<SessionInput> input = sessions.stream()
                .map(c -> new SessionInput(
                        c.getId(), c.getSessionDate(), c.getCommission(),
                        c.getSubject(), c.getClassLabel(), c.effectiveHours()))
                .toList();

        Result r = TeachingSettlementEngine.compute(s.getRole(), s.getHourlyRate(), input);

        s.setPerClassBonusHours(r.perClassBonusHours());
        s.setClassCount(r.classCount());
        s.setTotalHours(r.totalHours());
        s.setBonusHours(r.bonusHours());
        s.setBillableHours(r.billableHours());
        s.setTotalAmount(r.totalAmount());

        List<TeachingSettlementLine> lines = new ArrayList<>();
        for (var l : r.lines()) {
            lines.add(TeachingSettlementLine.builder()
                    .classSessionId(l.sessionId())
                    .sessionDate(l.sessionDate())
                    .commission(l.commission())
                    .subject(l.subject())
                    .classLabel(l.classLabel())
                    .hoursPaid(l.hoursPaid())
                    .build());
        }
        s.replaceLines(lines);

        log.info("Liquidación docente {}-{} {} ({}): {} clases, {} h, total {}",
                s.getPeriodYear(), s.getPeriodMonth(), s.getStaffName(), s.getRole(),
                r.classCount(), r.billableHours(), r.totalAmount());
    }

    private List<ClassSession> sessionsFor(
            UUID staffId, TeachingRole role, LocalDate from, LocalDate to) {
        return role == TeachingRole.PRECEPTORA
                ? sessionRepository.findPreceptorSessions(staffId, from, to)
                : sessionRepository.findTeachingSessions(staffId, from, to);
    }

    /**
     * Valor hora: el explícito de la liquidación, si no el override de la persona,
     * si no el del catálogo por rol.
     */
    private BigDecimal resolveRate(BigDecimal explicit, Staff staff, TeachingRole role) {
        if (explicit != null) return explicit;
        if (staff.getHourlyRate() != null) return staff.getHourlyRate();

        String name = role == TeachingRole.PRECEPTORA ? RATE_PRECEPTORA : RATE_DOCENTE;
        return activityTypeRepository.findByName(name)
                .map(ActivityType::getRatePerHour)
                .orElseThrow(() -> new ConflictException(
                        "No hay valor hora configurado para " + role
                        + ". Cargá «" + name + "» en tipos de actividad, o poné el valor a mano."));
    }

    /**
     * Quien cobra sueldo fijo no entra en la liquidación por horas. Falla acá en vez
     * de emitir un pago que no corresponde (caso Ailen).
     */
    private void requirePaidByHours(Staff staff) {
        if (Boolean.FALSE.equals(staff.getPaidByHours())) {
            throw new ConflictException(fullName(staff)
                    + " cobra sueldo fijo y no entra en la liquidación por horas."
                    + " Si esto cambió, destildá «sueldo fijo» en Personal Académico.");
        }
    }

    private static String fullName(Staff s) {
        return (s.getLastName() + ", " + s.getFirstName()).trim();
    }

    private Staff findStaff(UUID id) {
        return staffRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Staff", id));
    }

    private TeachingSettlement find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("TeachingSettlement", id));
    }
}
