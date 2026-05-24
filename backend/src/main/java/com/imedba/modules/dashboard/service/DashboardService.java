package com.imedba.modules.dashboard.service;

import com.imedba.modules.booksale.entity.BookSale;
import com.imedba.modules.booksale.repository.BookSaleRepository;
import com.imedba.modules.course.repository.CourseRepository;
import com.imedba.modules.dashboard.dto.ActivityItemResponse;
import com.imedba.modules.dashboard.dto.DashboardSummaryResponse;
import com.imedba.modules.dashboard.dto.OverdueInstallmentResponse;
import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.enrollment.repository.EnrollmentRepository;
import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import com.imedba.modules.installment.repository.InstallmentRepository;
import com.imedba.modules.payment.entity.Payment;
import com.imedba.modules.payment.repository.PaymentRepository;
import com.imedba.modules.student.entity.Student;
import com.imedba.modules.student.repository.StudentRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Provee los KPIs y feeds que muestra el dashboard del SPA.
 * Contratos espejados al mock del frontend (reunión 2026-05-22 §2.9).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final ZoneId ZONE_AR = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final int ACTIVITY_LIMIT = 8;
    private static final int OVERDUE_MIN_DAYS = 10;

    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final InstallmentRepository installmentRepository;
    private final PaymentRepository paymentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final BookSaleRepository bookSaleRepository;

    public DashboardSummaryResponse summary() {
        long alumnosActivos = studentRepository.findAll().stream()
                .filter(s -> Boolean.TRUE.equals(s.getActive()))
                .count();
        long cursosActivos = courseRepository.findAll().stream()
                .filter(c -> Boolean.TRUE.equals(c.getActive()))
                .count();
        long cuotasVencidas = installmentRepository.findAll().stream()
                .filter(i -> i.getStatus() == InstallmentStatus.OVERDUE)
                .count();

        ZonedDateTime nowAr = ZonedDateTime.now(ZONE_AR);
        int month = nowAr.getMonthValue();
        int year = nowAr.getYear();
        BigDecimal ingresosMes = paymentRepository.findAll().stream()
                .filter(p -> matchesMonth(p, year, month))
                .map(p -> {
                    BigDecimal base = p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO;
                    BigDecimal late = p.getLateFeeAmount() != null ? p.getLateFeeAmount() : BigDecimal.ZERO;
                    return base.add(late);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new DashboardSummaryResponse(alumnosActivos, cursosActivos, cuotasVencidas, ingresosMes);
    }

    public List<OverdueInstallmentResponse> overdueInstallments() {
        LocalDate today = LocalDate.now(ZONE_AR);

        // Pre-agrupo conteo de cuotas por inscripción para no hacer N+1.
        Map<Object, Long> totalByEnrollment = new HashMap<>();
        for (Installment i : installmentRepository.findAll()) {
            Object enrId = i.getEnrollment() != null ? i.getEnrollment().getId() : null;
            if (enrId == null) continue;
            totalByEnrollment.merge(enrId, 1L, Long::sum);
        }

        List<OverdueInstallmentResponse> out = new ArrayList<>();
        for (Installment i : installmentRepository.findAll()) {
            if (i.getStatus() != InstallmentStatus.OVERDUE) continue;
            LocalDate due = i.getDueDate();
            long days = due != null ? today.toEpochDay() - due.toEpochDay() : 0;
            if (days <= OVERDUE_MIN_DAYS) continue;

            Enrollment e = i.getEnrollment();
            String alumno = (e != null && e.getStudent() != null)
                    ? formatStudent(e.getStudent()) : "—";
            String curso = (e != null && e.getCourse() != null)
                    ? e.getCourse().getName() : "—";
            long total = e != null ? totalByEnrollment.getOrDefault(e.getId(), 0L) : 0L;
            BigDecimal monto = i.totalDue();
            out.add(new OverdueInstallmentResponse(
                    i.getId(), alumno, curso, i.getNumber(), total, days, monto));
        }
        out.sort(Comparator.comparingLong(OverdueInstallmentResponse::diasVencidos).reversed());
        return out;
    }

    public List<ActivityItemResponse> recentActivity() {
        List<ActivityItemResponse> acts = new ArrayList<>();

        // Top 8 pagos más recientes
        paymentRepository
                .findAll(PageRequest.of(0, ACTIVITY_LIMIT, Sort.by(Sort.Direction.DESC, "paymentDate")))
                .forEach(p -> acts.add(new ActivityItemResponse(
                        "pay-" + p.getId(),
                        "payment",
                        "Pago registrado",
                        enrollmentLabel(p.getEnrollment()),
                        p.getAmount(),
                        p.getPaymentDate())));

        // Top 8 inscripciones más recientes
        enrollmentRepository
                .findAll(PageRequest.of(0, ACTIVITY_LIMIT, Sort.by(Sort.Direction.DESC, "createdAt")))
                .forEach(e -> acts.add(new ActivityItemResponse(
                        "enr-" + e.getId(),
                        "enrollment",
                        "Nueva inscripción",
                        enrollmentLabel(e),
                        null,
                        e.getCreatedAt())));

        // Top 8 ventas de libros más recientes
        bookSaleRepository
                .findAll(PageRequest.of(0, ACTIVITY_LIMIT, Sort.by(Sort.Direction.DESC, "saleDate")))
                .forEach(s -> acts.add(new ActivityItemResponse(
                        "sale-" + s.getId(),
                        "sale",
                        "Venta de libro",
                        bookSaleDetail(s),
                        s.getTotalAmount(),
                        s.getSaleDate())));

        acts.sort(Comparator.comparing(
                ActivityItemResponse::date,
                Comparator.nullsLast(Comparator.reverseOrder())));
        return acts.stream().limit(ACTIVITY_LIMIT).toList();
    }

    // ===== helpers =====

    private static boolean matchesMonth(Payment p, int year, int month) {
        Instant pd = p.getPaymentDate();
        if (pd == null) return false;
        ZonedDateTime z = pd.atZone(ZONE_AR);
        return z.getYear() == year && z.getMonthValue() == month;
    }

    private static String formatStudent(Student s) {
        if (s == null) return "—";
        String ln = s.getLastName() == null ? "" : s.getLastName();
        String fn = s.getFirstName() == null ? "" : s.getFirstName();
        return (ln + ", " + fn).trim();
    }

    private static String enrollmentLabel(Enrollment e) {
        if (e == null) return "—";
        String studentPart = e.getStudent() != null ? formatStudent(e.getStudent()) : "—";
        String coursePart = e.getCourse() != null && e.getCourse().getName() != null
                ? e.getCourse().getName() : "—";
        return studentPart + " · " + coursePart;
    }

    private static String bookSaleDetail(BookSale s) {
        if (s == null) return "—";
        String book = s.getBook() != null && s.getBook().getName() != null
                ? s.getBook().getName() : "—";
        return book;
    }
}
