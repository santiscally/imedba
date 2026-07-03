package com.imedba.modules.enrollment.service;

import com.imedba.common.auth.AuthUtils;
import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.common.security.SegmentationFilter;
import com.imedba.modules.course.entity.Course;
import com.imedba.modules.course.repository.CourseRepository;
import com.imedba.modules.discount_campaign.entity.DiscountCampaign;
import com.imedba.modules.discount_campaign.entity.DiscountType;
import com.imedba.modules.discount_campaign.repository.DiscountCampaignRepository;
import com.imedba.modules.enrollment.dto.EnrollmentCreateRequest;
import com.imedba.modules.enrollment.dto.EnrollmentResponse;
import com.imedba.modules.enrollment.dto.EnrollmentUpdateRequest;
import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.enrollment.entity.EnrollmentStatus;
import com.imedba.modules.enrollment.entity.InstallmentDistribution;
import com.imedba.modules.enrollment.entity.PaymentGroup;
import com.imedba.modules.enrollment.mapper.EnrollmentMapper;
import com.imedba.modules.enrollment.repository.EnrollmentRepository;
import com.imedba.modules.enrollment.repository.EnrollmentSpecs;
import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import com.imedba.modules.installment.repository.InstallmentRepository;
import com.imedba.modules.installment.service.InstallmentGenerator;
import com.imedba.modules.notification.contract.ContractData;
import com.imedba.modules.notification.contract.ContractPdfRenderer;
import com.imedba.modules.notification.mail.MailAttachment;
import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.entity.RelatedEntityType;
import com.imedba.modules.notification.service.NotificationService;
import com.imedba.modules.notification.template.NotificationTemplate;
import com.imedba.modules.notification.template.NotificationTemplates;
import com.imedba.modules.student.entity.Student;
import com.imedba.modules.student.repository.StudentRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class EnrollmentService {

    private static final List<EnrollmentStatus> ACTIVE_STATUSES =
            List.of(EnrollmentStatus.ACTIVE, EnrollmentStatus.SUSPENDED);

    private static final ZoneId ZONE_AR = ZoneId.of("America/Argentina/Buenos_Aires");

    private final EnrollmentRepository repository;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final InstallmentRepository installmentRepository;
    private final DiscountCampaignRepository discountCampaignRepository;
    private final NotificationService notificationService;
    private final ContractPdfRenderer contractPdfRenderer;
    private final EnrollmentMapper mapper;

    @Transactional(readOnly = true)
    public Page<EnrollmentResponse> list(
            UUID studentId, UUID courseId, EnrollmentStatus status, Pageable pageable) {
        Specification<Enrollment> spec = Specification
                .where(EnrollmentSpecs.byStudent(studentId))
                .and(EnrollmentSpecs.byCourse(courseId))
                .and(EnrollmentSpecs.byStatus(status))
                .and(EnrollmentSpecs.byBusinessUnits(SegmentationFilter.allowedBusinessUnits()))
                .and(vendedoraScope());
        return repository.findAll(spec, pageable).map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<EnrollmentResponse> listMine(EnrollmentStatus status, Pageable pageable) {
        UUID me = AuthUtils.currentUserId().orElseThrow(
                () -> new NotFoundException("Usuario autenticado no resuelto"));
        Specification<Enrollment> spec = Specification
                .where(EnrollmentSpecs.byEnrolledBy(me))
                .and(EnrollmentSpecs.byStatus(status));
        return repository.findAll(spec, pageable).map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public EnrollmentResponse get(UUID id) {
        return mapper.toResponse(findVisible(id));
    }

    public EnrollmentResponse create(EnrollmentCreateRequest req) {
        Student student = studentRepository.findById(req.studentId())
                .orElseThrow(() -> NotFoundException.of("Student", req.studentId()));
        Course course = courseRepository.findById(req.courseId())
                .orElseThrow(() -> NotFoundException.of("Course", req.courseId()));

        if (repository.existsByStudentIdAndCourseIdAndStatusIn(
                student.getId(), course.getId(), ACTIVE_STATUSES)) {
            throw new ConflictException(
                    "El alumno ya tiene una inscripción activa o suspendida en ese curso");
        }

        // Reunión IMEDBA 2026-05-22 (Nico 18:22): un alumno puede tener varias inscripciones
        // a lo largo del tiempo (años distintos), pero NO dos simultáneamente activas.
        // ACTIVE / SUSPENDED cuentan como "activas"; COMPLETED / CANCELLED no.
        if (repository.existsByStudentIdAndStatusIn(student.getId(), ACTIVE_STATUSES)) {
            throw new ConflictException(
                    "El alumno ya tiene una inscripción activa o suspendida a otro curso. "
                            + "Debe finalizarla o cancelarla antes de inscribirlo a uno nuevo.");
        }

        BigDecimal listPrice = req.listPrice() != null
                ? req.listPrice()
                : nullToZero(course.getEnrollmentPrice()).add(nullToZero(course.getCoursePrice()));
        BigDecimal bookPrice = nullToZero(req.bookPrice());

        // Reunión IMEDBA 2026-05-22 §2.3: resolver descuento con prioridades:
        // 1) Si vendedora pasa `discountPercentage` manual → respetar (override).
        // 2) Si vendedora elige `discountCampaignId` → calcular % desde la campaña.
        // 3) Si no hay nada → buscar campaña vigente en enrollmentDate y auto-aplicarla.
        Instant enrollDate = req.enrollmentDate() != null ? req.enrollmentDate() : Instant.now();
        ResolvedDiscount rd = resolveDiscount(req, enrollDate, listPrice);
        BigDecimal discount = rd.percentage();
        BigDecimal finalPrice = computeFinalPrice(listPrice, discount);
        BigDecimal totalPrice = finalPrice.add(bookPrice);

        Enrollment e = Enrollment.builder()
                .student(student)
                .course(course)
                .discountCampaignId(rd.campaignId())
                .enrolledBy(AuthUtils.currentUserId().orElse(null))
                .enrollmentDate(enrollDate)
                .listPrice(listPrice)
                .discountPercentage(discount)
                .finalPrice(finalPrice)
                .bookPrice(bookPrice)
                .totalPrice(totalPrice)
                .enrollmentFee(req.enrollmentFee())
                .numInstallments(req.numInstallments() != null ? req.numInstallments() : 1)
                .paymentGroup(req.paymentGroup() != null ? req.paymentGroup() : PaymentGroup.GROUP_1)
                .contractFilePath(req.contractFilePath())
                .status(EnrollmentStatus.ACTIVE)
                .notes(req.notes())
                .build();

        Enrollment saved = repository.save(e);
        InstallmentDistribution mode = req.distributionMode() != null
                ? req.distributionMode() : InstallmentDistribution.SEPARATE;
        List<Installment> schedule = InstallmentGenerator.generate(saved, mode);
        if (!schedule.isEmpty()) {
            installmentRepository.saveAll(schedule);
        }
        enqueueEnrollmentNotifications(saved);
        return mapper.toResponse(saved);
    }

    private void enqueueEnrollmentNotifications(Enrollment saved) {
        Student s = saved.getStudent();
        if (s == null || s.getEmail() == null || s.getEmail().isBlank()) {
            return;
        }
        String firstName = s.getFirstName() != null ? s.getFirstName() : "";
        String courseName = saved.getCourse() != null ? saved.getCourse().getName() : "";
        NotificationTemplate welcome = NotificationTemplates.welcome(firstName, courseName);
        NotificationTemplate contract = NotificationTemplates.contract(firstName, courseName);
        notificationService.enqueue(NotificationType.WELCOME, s.getEmail(), welcome,
                RelatedEntityType.ENROLLMENT, saved.getId());
        notificationService.enqueue(NotificationType.CONTRACT, s.getEmail(), contract,
                RelatedEntityType.ENROLLMENT, saved.getId(), contractPdf(saved));
    }

    /** Renderiza el PDF del contrato como adjunto; si falla, degrada a mail sin adjunto (no bloquea el alta). */
    private MailAttachment contractPdf(Enrollment e) {
        try {
            byte[] pdf = contractPdfRenderer.render(contractDataFrom(e));
            return MailAttachment.pdf(contractFilename(e), pdf);
        } catch (RuntimeException ex) {
            log.warn("No se pudo generar el PDF del contrato para enrollment={}: {}",
                    e.getId(), ex.getMessage());
            return null;
        }
    }

    private static ContractData contractDataFrom(Enrollment e) {
        Student s = e.getStudent();
        Course c = e.getCourse();
        BigDecimal disc = nullToZero(e.getDiscountPercentage());
        String discountLabel = disc.signum() > 0
                ? disc.stripTrailingZeros().toPlainString() + "%" : "—";
        return new ContractData(
                s.getFirstName(), s.getLastName(), s.getNationality(), s.getDni(),
                null,                          // Student no modela fecha de nacimiento (queda vacío)
                s.getEmail(),
                e.getListPrice(), e.getTotalPrice(), discountLabel,
                c != null ? c.getName() : "",
                null, null);                   // Course no modela inicio/fin de grupo → "A confirmar"
    }

    private static String contractFilename(Enrollment e) {
        String last = e.getStudent().getLastName() != null ? e.getStudent().getLastName() : "alumno";
        return ("contrato-" + last).toLowerCase().replaceAll("[^a-z0-9._-]+", "-") + ".pdf";
    }

    public EnrollmentResponse update(UUID id, EnrollmentUpdateRequest req) {
        Enrollment e = findVisible(id);
        mapper.updateEntity(req, e);
        recalculatePrices(e);
        return mapper.toResponse(e);
    }

    public EnrollmentResponse suspend(UUID id) {
        Enrollment e = findVisible(id);
        if (e.getStatus() != EnrollmentStatus.ACTIVE) {
            throw new ConflictException(
                    "Sólo se pueden suspender inscripciones ACTIVE (estado actual: " + e.getStatus() + ")");
        }
        e.setStatus(EnrollmentStatus.SUSPENDED);
        return mapper.toResponse(e);
    }

    public EnrollmentResponse reactivate(UUID id) {
        Enrollment e = findVisible(id);
        if (e.getStatus() != EnrollmentStatus.SUSPENDED) {
            throw new ConflictException(
                    "Sólo se pueden reactivar inscripciones SUSPENDED (estado actual: " + e.getStatus() + ")");
        }
        e.setStatus(EnrollmentStatus.ACTIVE);
        return mapper.toResponse(e);
    }

    public EnrollmentResponse cancel(UUID id) {
        Enrollment e = findVisible(id);
        if (e.getStatus() == EnrollmentStatus.COMPLETED || e.getStatus() == EnrollmentStatus.CANCELLED) {
            throw new ConflictException(
                    "No se puede cancelar una inscripción " + e.getStatus());
        }
        e.setStatus(EnrollmentStatus.CANCELLED);
        cancelOpenInstallments(e.getId());
        return mapper.toResponse(e);
    }

    public void delete(UUID id) {
        Enrollment e = findVisible(id);
        boolean hasPaid = installmentRepository.findByEnrollmentIdOrderByNumberAsc(id).stream()
                .anyMatch(i -> i.getStatus() == InstallmentStatus.PAID);
        if (hasPaid) {
            throw new ConflictException(
                    "La inscripción tiene cuotas pagadas: no puede eliminarse. "
                            + "Cancelala para conservar el historial de pagos.");
        }
        cancelOpenInstallments(id);
        notificationService.cancelQueuedByRelated(RelatedEntityType.ENROLLMENT, id);
        repository.delete(e);
    }

    /** Anula las cuotas PENDING/OVERDUE de la inscripción (no tocan PAID ni CANCELLED). */
    private void cancelOpenInstallments(UUID enrollmentId) {
        for (Installment i : installmentRepository.findByEnrollmentIdOrderByNumberAsc(enrollmentId)) {
            if (i.getStatus() == InstallmentStatus.PENDING
                    || i.getStatus() == InstallmentStatus.OVERDUE) {
                i.setStatus(InstallmentStatus.CANCELLED);
            }
        }
    }

    // --- helpers ---

    private Enrollment findVisible(UUID id) {
        Enrollment e = repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Enrollment", id));
        // Segmentación Residencias↔FS: si el curso no es visible, 404 (no leak existencia).
        if (e.getCourse() != null && !SegmentationFilter.canSee(e.getCourse().getBusinessUnit())) {
            throw NotFoundException.of("Enrollment", id);
        }
        if (AuthUtils.isVendedoraOnly()) {
            UUID me = AuthUtils.currentUserId().orElse(null);
            if (!Objects.equals(me, e.getEnrolledBy())) {
                throw NotFoundException.of("Enrollment", id);
            }
        }
        return e;
    }

    private Specification<Enrollment> vendedoraScope() {
        if (!AuthUtils.isVendedoraOnly()) {
            return null;
        }
        UUID me = AuthUtils.currentUserId().orElse(null);
        return EnrollmentSpecs.byEnrolledBy(me);
    }

    private void recalculatePrices(Enrollment e) {
        BigDecimal listPrice  = nullToZero(e.getListPrice());
        BigDecimal discount   = nullToZero(e.getDiscountPercentage());
        BigDecimal bookPrice  = nullToZero(e.getBookPrice());
        BigDecimal finalPrice = computeFinalPrice(listPrice, discount);
        e.setFinalPrice(finalPrice);
        e.setTotalPrice(finalPrice.add(bookPrice));
    }

    private static BigDecimal computeFinalPrice(BigDecimal listPrice, BigDecimal discountPct) {
        BigDecimal factor = BigDecimal.ONE.subtract(
                discountPct.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
        return listPrice.multiply(factor).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal nullToZero(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    /**
     * Resuelve qué descuento aplicar a una inscripción nueva.
     * Reglas (pedidas en reunión 2026-05-22 §2.3):
     *   1. Vendedora pasa % manual ({@code req.discountPercentage()} no null y > 0) → respetar el %,
     *      conservar el {@code discountCampaignId} si vino (tracking puro, no recalcula).
     *   2. Vendedora elige campaña por id → derivar % de la campaña (PERCENTAGE directo;
     *      FIXED_AMOUNT se convierte a % equivalente respecto al listPrice).
     *   3. Nada de lo anterior → buscar campaña vigente en {@code enrollmentDate} y auto-aplicarla.
     */
    private ResolvedDiscount resolveDiscount(EnrollmentCreateRequest req, Instant enrollDate, BigDecimal listPrice) {
        BigDecimal manualPct = req.discountPercentage();
        if (manualPct != null && manualPct.signum() > 0) {
            return new ResolvedDiscount(req.discountCampaignId(), manualPct);
        }

        if (req.discountCampaignId() != null) {
            DiscountCampaign chosen = discountCampaignRepository.findById(req.discountCampaignId())
                    .orElseThrow(() -> NotFoundException.of("DiscountCampaign", req.discountCampaignId()));
            return new ResolvedDiscount(chosen.getId(), percentageFromCampaign(chosen, listPrice));
        }

        LocalDate on = enrollDate.atZone(ZONE_AR).toLocalDate();
        Optional<DiscountCampaign> active = discountCampaignRepository.findActiveOn(on)
                .stream().findFirst();
        if (active.isPresent()) {
            DiscountCampaign c = active.get();
            return new ResolvedDiscount(c.getId(), percentageFromCampaign(c, listPrice));
        }

        return new ResolvedDiscount(null, BigDecimal.ZERO);
    }

    private static BigDecimal percentageFromCampaign(DiscountCampaign campaign, BigDecimal listPrice) {
        BigDecimal value = nullToZero(campaign.getDiscountValue());
        if (campaign.getDiscountType() == DiscountType.PERCENTAGE) {
            return value;
        }
        // FIXED_AMOUNT → derivar % equivalente. Si el listPrice es 0, devolver 0 para no dividir por cero.
        if (listPrice.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        return value.multiply(BigDecimal.valueOf(100))
                .divide(listPrice, 4, RoundingMode.HALF_UP);
    }

    private record ResolvedDiscount(UUID campaignId, BigDecimal percentage) {}
}
