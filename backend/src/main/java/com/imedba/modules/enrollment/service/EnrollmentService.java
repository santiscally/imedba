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
import com.imedba.modules.book.entity.Book;
import com.imedba.modules.book.repository.BookRepository;
import com.imedba.modules.booksale.entity.BookSale;
import com.imedba.modules.booksale.repository.BookSaleRepository;
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
    private final BookRepository bookRepository;
    private final BookSaleRepository bookSaleRepository;
    private final EnrollmentMapper mapper;

    /** Nombre del libro que se auto-agrega en cursos con includes_prema_book (V035). */
    private static final String PREMA_BOOK_NAME = "PREMA";

    @Transactional(readOnly = true)
    public Page<EnrollmentResponse> list(
            UUID studentId, UUID courseId, EnrollmentStatus status,
            Boolean contractSigned, Pageable pageable) {
        Specification<Enrollment> spec = Specification
                .where(EnrollmentSpecs.byStudent(studentId))
                .and(EnrollmentSpecs.byCourse(courseId))
                .and(EnrollmentSpecs.byStatus(status))
                .and(EnrollmentSpecs.byContractSigned(contractSigned))
                .and(EnrollmentSpecs.byBusinessUnits(SegmentationFilter.allowedBusinessUnits()))
                .and(vendedoraScope());
        return repository.findAll(spec, pageable).map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<EnrollmentResponse> listMine(EnrollmentStatus status, Pageable pageable) {
        UUID me = AuthUtils.requireCurrentUserId();
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

        InstallmentDistribution mode = req.distributionMode() != null
                ? req.distributionMode() : InstallmentDistribution.SEPARATE;

        Enrollment e = Enrollment.builder()
                .student(student)
                .course(course)
                .discountCampaignId(rd.campaignId())
                .enrolledBy(AuthUtils.requireCurrentUserId())
                .enrollmentDate(enrollDate)
                .listPrice(listPrice)
                .discountPercentage(discount)
                .finalPrice(finalPrice)
                .bookPrice(bookPrice)
                .totalPrice(totalPrice)
                .enrollmentFee(req.enrollmentFee())
                .numInstallments(req.numInstallments() != null ? req.numInstallments() : 1)
                .paymentGroup(req.paymentGroup() != null ? req.paymentGroup() : PaymentGroup.GROUP_1)
                .distributionMode(mode)
                .contractFilePath(req.contractFilePath())
                .status(EnrollmentStatus.ACTIVE)
                .notes(req.notes())
                .build();

        Enrollment saved = repository.save(e);
        List<Installment> schedule = InstallmentGenerator.generate(saved, mode);
        if (!schedule.isEmpty()) {
            installmentRepository.saveAll(schedule);
        }
        autoRegisterPremaBook(saved);
        enqueueEnrollmentNotifications(saved);
        return mapper.toResponse(saved);
    }

    /**
     * Docx Jaque 2026-07-20 §Editorial: si el curso tiene includes_prema_book en true,
     * se genera automáticamente una BookSale del libro PREMA (qty=1, unitPrice=0,
     * studentSale=true) para descontar del stock. Si el libro no está en el catálogo
     * (V035 aún no corrió, o se lo eliminó) → log y sigo, no bloqueo el alta.
     */
    private void autoRegisterPremaBook(Enrollment enrollment) {
        Course c = enrollment.getCourse();
        if (c == null || !Boolean.TRUE.equals(c.getIncludesPremaBook())) return;

        Optional<Book> premaOpt = bookRepository.findFirstByNameAndActiveTrue(PREMA_BOOK_NAME);
        if (premaOpt.isEmpty()) {
            log.warn("Curso {} tiene includes_prema_book=true pero no existe el libro '{}' — se omite auto-descuento",
                    c.getId(), PREMA_BOOK_NAME);
            return;
        }
        Book prema = premaOpt.get();
        BookSale sale = BookSale.builder()
                .book(prema)
                .student(enrollment.getStudent())
                .enrollment(enrollment)
                .quantity(1)
                .unitPrice(BigDecimal.ZERO)
                .studentSale(Boolean.TRUE)
                .totalAmount(BigDecimal.ZERO)
                .saleDate(Instant.now())
                .soldBy(AuthUtils.requireCurrentUserId())
                .notes("Auto-descuento por inscripción a curso PREMA")
                .build();
        bookSaleRepository.save(sale);
        // Descontar stock (append-only, sin ir por BookSaleService.register que valida stock >0)
        Integer stock = prema.getStockQuantity() != null ? prema.getStockQuantity() : 0;
        prema.setStockQuantity(stock - 1);
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

    /**
     * Genera el PDF del contrato para descarga directa.
     *
     * <p>Reportado el 2026-07-23: «no me permite descargar contrato», y en la llamada
     * del 24-jul: «como que no me decía nada». Causa: el renderer existía pero sólo se
     * usaba para adjuntar el PDF al mail de CONTRACT — no había endpoint de descarga,
     * así que el botón del front no tenía contra qué pegar.
     *
     * <p>A diferencia de {@link #contractPdf(Enrollment)} (que degrada a mail sin
     * adjunto para no bloquear el alta), acá el error se propaga: si el PDF no sale,
     * la descarga tiene que fallar con un error visible, no con un archivo vacío.
     */
    @Transactional(readOnly = true)
    public ContractDownload renderContract(UUID id) {
        Enrollment e = findVisible(id);
        byte[] pdf = contractPdfRenderer.render(contractDataFrom(e));
        return new ContractDownload("contrato-imedba.pdf", pdf);
    }

    /** PDF del contrato listo para servir. */
    public record ContractDownload(String filename, byte[] content) {}

    /** Renderiza el PDF del contrato como adjunto; si falla, degrada a mail sin adjunto (no bloquea el alta). */
    private MailAttachment contractPdf(Enrollment e) {
        try {
            byte[] pdf = contractPdfRenderer.render(contractDataFrom(e));
            return MailAttachment.pdf("contrato-imedba.pdf", pdf);
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


    public EnrollmentResponse update(UUID id, EnrollmentUpdateRequest req) {
        Enrollment e = findVisible(id);

        // Snapshot pre-mapping — si alguno de los campos que definen el cronograma
        // cambia, hay que regenerar las cuotas PENDING/OVERDUE (Jaque, docx 07-2026).
        BigDecimal   prevListPrice     = e.getListPrice();
        BigDecimal   prevDiscount      = e.getDiscountPercentage();
        BigDecimal   prevBookPrice     = e.getBookPrice();
        BigDecimal   prevEnrollmentFee = e.getEnrollmentFee();
        Integer      prevNumInst       = e.getNumInstallments();

        mapper.updateEntity(req, e);
        recalculatePrices(e);

        boolean scheduleChanged =
                !Objects.equals(prevListPrice,     e.getListPrice())
             || !Objects.equals(prevDiscount,      e.getDiscountPercentage())
             || !Objects.equals(prevBookPrice,     e.getBookPrice())
             || !Objects.equals(prevEnrollmentFee, e.getEnrollmentFee())
             || !Objects.equals(prevNumInst,       e.getNumInstallments());
        if (scheduleChanged) {
            regenerateInstallments(e);
        }

        return mapper.toResponse(e);
    }

    /**
     * Marca o desmarca el contrato como firmado (pedido 2026-07-23).
     *
     * <p>Endpoint propio en vez de pasar por {@code update}: el checkbox del listado
     * no tiene que mandar el resto del payload ni disparar el recálculo de precios.
     * Idempotente — volver a tildar no corre la fecha ya registrada.
     */
    public EnrollmentResponse setContractSigned(UUID id, boolean signed) {
        Enrollment e = findVisible(id);
        if (signed) {
            if (e.getContractSignedAt() == null) {
                e.setContractSignedAt(Instant.now());
            }
        } else {
            e.setContractSignedAt(null);
        }
        return mapper.toResponse(e);
    }

    /**
     * Regenera el cronograma de cuotas al editar una inscripción existente.
     * Preserva las cuotas ya pagadas (PAID) y las canceladas (CANCELLED) — el
     * cambio de cronograma sólo afecta el saldo pendiente.
     *
     * Reglas:
     *  - Si hay cuotas PAID, se conservan y se descuenta lo ya pagado del monto total.
     *    Las cuotas PENDING/OVERDUE se eliminan y se regeneran para cubrir el remanente.
     *  - Si no hay PAID, se borran todas las cuotas (excepto CANCELLED por historial)
     *    y se regenera desde cero.
     *  - Numeración: la nueva secuencia arranca en (mayor number existente + 1) para
     *    no reciclar IDs de negocio.
     */
    private void regenerateInstallments(Enrollment e) {
        List<Installment> current = installmentRepository.findByEnrollmentIdOrderByNumberAsc(e.getId());
        BigDecimal paidAmount = BigDecimal.ZERO;
        int maxKeptNumber = 0;
        List<Installment> toDelete = new java.util.ArrayList<>();
        for (Installment i : current) {
            if (i.getStatus() == InstallmentStatus.PAID) {
                paidAmount = paidAmount.add(i.getAmount() != null ? i.getAmount() : BigDecimal.ZERO);
                if (i.getNumber() != null && i.getNumber() > maxKeptNumber) {
                    maxKeptNumber = i.getNumber();
                }
            } else if (i.getStatus() == InstallmentStatus.CANCELLED) {
                if (i.getNumber() != null && i.getNumber() > maxKeptNumber) {
                    maxKeptNumber = i.getNumber();
                }
            } else {
                toDelete.add(i);
            }
        }

        // Al regenerar el cronograma post-cambio, si algún pago ya se aplicó (matrícula
        // paga, primera cuota paga) hay que descontar ese monto del nuevo total y
        // dividir el remanente entre las cuotas restantes. Ajusto una copia efímera de
        // la inscripción para no modificar los campos persistidos.
        BigDecimal remainingTotal = nullToZero(e.getTotalPrice()).subtract(paidAmount);
        if (remainingTotal.signum() < 0) remainingTotal = BigDecimal.ZERO;

        int remainingInst = Math.max(1,
                (e.getNumInstallments() != null ? e.getNumInstallments() : 1) - countPaidNonZero(current));
        if (remainingTotal.signum() == 0 || remainingInst == 0) {
            if (!toDelete.isEmpty()) installmentRepository.deleteAll(toDelete);
            return;
        }

        // Recompute cronograma usando un enrollment "efectivo" con los remanentes.
        Enrollment ghost = Enrollment.builder()
                .student(e.getStudent())
                .course(e.getCourse())
                .enrollmentDate(e.getEnrollmentDate())
                .listPrice(remainingTotal)
                .discountPercentage(BigDecimal.ZERO)
                .finalPrice(remainingTotal)
                .bookPrice(BigDecimal.ZERO)
                .totalPrice(remainingTotal)
                .enrollmentFee(BigDecimal.ZERO)
                .numInstallments(remainingInst)
                .paymentGroup(e.getPaymentGroup())
                .build();
        List<Installment> fresh = InstallmentGenerator.generate(ghost, InstallmentDistribution.TOTAL);

        // Renumerar desde maxKeptNumber+1 para no colisionar con las que preservamos.
        int nextNumber = maxKeptNumber + 1;
        for (Installment ni : fresh) {
            ni.setEnrollment(e);
            ni.setNumber(nextNumber++);
        }

        if (!toDelete.isEmpty()) installmentRepository.deleteAll(toDelete);
        if (!fresh.isEmpty())    installmentRepository.saveAll(fresh);
    }

    private static int countPaidNonZero(List<Installment> installments) {
        int n = 0;
        for (Installment i : installments) {
            if (i.getStatus() == InstallmentStatus.PAID
                    && i.getNumber() != null && i.getNumber() > 0) n++;
        }
        return n;
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
            UUID me = AuthUtils.requireCurrentUserId();
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
        UUID me = AuthUtils.requireCurrentUserId();
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
