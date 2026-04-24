package com.imedba.modules.enrollment.service;

import com.imedba.common.auth.AuthUtils;
import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.course.entity.Course;
import com.imedba.modules.course.repository.CourseRepository;
import com.imedba.modules.enrollment.dto.EnrollmentCreateRequest;
import com.imedba.modules.enrollment.dto.EnrollmentResponse;
import com.imedba.modules.enrollment.dto.EnrollmentUpdateRequest;
import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.enrollment.entity.EnrollmentStatus;
import com.imedba.modules.enrollment.mapper.EnrollmentMapper;
import com.imedba.modules.enrollment.repository.EnrollmentRepository;
import com.imedba.modules.enrollment.repository.EnrollmentSpecs;
import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.repository.InstallmentRepository;
import com.imedba.modules.installment.service.InstallmentGenerator;
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
public class EnrollmentService {

    private static final List<EnrollmentStatus> ACTIVE_STATUSES =
            List.of(EnrollmentStatus.ACTIVE, EnrollmentStatus.SUSPENDED);

    private final EnrollmentRepository repository;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final InstallmentRepository installmentRepository;
    private final NotificationService notificationService;
    private final EnrollmentMapper mapper;

    @Transactional(readOnly = true)
    public Page<EnrollmentResponse> list(
            UUID studentId, UUID courseId, EnrollmentStatus status, Pageable pageable) {
        Specification<Enrollment> spec = Specification
                .where(EnrollmentSpecs.byStudent(studentId))
                .and(EnrollmentSpecs.byCourse(courseId))
                .and(EnrollmentSpecs.byStatus(status))
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

        BigDecimal listPrice = req.listPrice() != null
                ? req.listPrice()
                : nullToZero(course.getEnrollmentPrice()).add(nullToZero(course.getCoursePrice()));
        BigDecimal discount  = nullToZero(req.discountPercentage());
        BigDecimal bookPrice = nullToZero(req.bookPrice());
        BigDecimal finalPrice = computeFinalPrice(listPrice, discount);
        BigDecimal totalPrice = finalPrice.add(bookPrice);

        Enrollment e = Enrollment.builder()
                .student(student)
                .course(course)
                .discountCampaignId(req.discountCampaignId())
                .enrolledBy(AuthUtils.currentUserId().orElse(null))
                .enrollmentDate(req.enrollmentDate() != null ? req.enrollmentDate() : Instant.now())
                .listPrice(listPrice)
                .discountPercentage(discount)
                .finalPrice(finalPrice)
                .bookPrice(bookPrice)
                .totalPrice(totalPrice)
                .enrollmentFee(req.enrollmentFee())
                .numInstallments(req.numInstallments() != null ? req.numInstallments() : 1)
                .paymentMethod(req.paymentMethod())
                .contractFilePath(req.contractFilePath())
                .status(EnrollmentStatus.ACTIVE)
                .notes(req.notes())
                .build();

        Enrollment saved = repository.save(e);
        List<Installment> schedule = InstallmentGenerator.generate(saved);
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
                RelatedEntityType.ENROLLMENT, saved.getId());
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
        return mapper.toResponse(e);
    }

    public void delete(UUID id) {
        repository.delete(findVisible(id));
    }

    // --- helpers ---

    private Enrollment findVisible(UUID id) {
        Enrollment e = repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Enrollment", id));
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
}
