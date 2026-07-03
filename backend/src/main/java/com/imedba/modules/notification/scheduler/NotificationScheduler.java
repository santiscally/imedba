package com.imedba.modules.notification.scheduler;

import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import com.imedba.modules.installment.repository.InstallmentRepository;
import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.entity.RelatedEntityType;
import com.imedba.modules.notification.service.NotificationService;
import com.imedba.modules.notification.template.NotificationTemplate;
import com.imedba.modules.notification.template.NotificationTemplates;
import com.imedba.modules.student.entity.Student;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Jobs de notificaciones:
 *   - <b>Pre-suspensión (06:05 AR)</b>: para cuotas OVERDUE con exactamente 20 días de mora,
 *     encolar un aviso al alumno "te suspenden Moodle en 2 días". La supresión efectiva
 *     del acceso Moodle la decide {@code InstallmentScheduler} al día 22.
 *   - <b>Dispatcher (cada minuto)</b>: procesa hasta {@link NotificationService#DISPATCH_BATCH}
 *     notificaciones en cola y las envía vía {@code MailSender}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationScheduler {

    /** Días desde el vencimiento en que se avisa al alumno de la suspensión próxima. */
    public static final int PRE_SUSPENSION_DAYS = 20;

    /** Días antes del vencimiento en que se manda el recordatorio de pago. */
    public static final int DUE_SOON_DAYS = 1;

    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    private final InstallmentRepository installmentRepository;
    private final NotificationService notificationService;

    @Scheduled(cron = "0 5 6 * * *", zone = "America/Argentina/Buenos_Aires")
    @Transactional
    public void enqueuePreSuspensionJob() {
        LocalDate today = LocalDate.now(ZONE);
        LocalDate target = today.minusDays(PRE_SUSPENSION_DAYS);
        List<Installment> cohort = installmentRepository.findOverdueBetween(target, target);
        int enqueued = 0;
        for (Installment i : cohort) {
            Enrollment e = i.getEnrollment();
            if (e == null) continue;
            Student s = e.getStudent();
            if (s == null || s.getEmail() == null || s.getEmail().isBlank()) {
                log.warn("Skip PRE_SUSPENSION: installment={} sin email de alumno", i.getId());
                continue;
            }
            NotificationTemplate tpl = NotificationTemplates.preSuspension(
                    firstName(s), i.getNumber(), i.getDueDate());
            notificationService.enqueue(
                    NotificationType.PRE_SUSPENSION, s.getEmail(), tpl,
                    RelatedEntityType.INSTALLMENT, i.getId());
            enqueued++;
        }
        log.info("Pre-suspension job: encoladas {} notificaciones (target due_date={})", enqueued, target);
    }

    /**
     * Recordatorio de pago un día antes del vencimiento (alerta "día 1" pedida por Nico).
     * Toma cuotas PENDING con due_date = mañana. El anti-spam lo da la idempotencia de
     * {@link NotificationService#enqueue} por (type, INSTALLMENT, id): si ya hay una
     * QUEUED/SENT para la cuota, no se reencola. (La cuota matchea sólo el día exacto
     * {@code due_date - 1}, así que naturalmente se dispara una vez por cuota.)
     */
    @Scheduled(cron = "0 15 6 * * *", zone = "America/Argentina/Buenos_Aires")
    @Transactional
    public void enqueueInstallmentDueSoonJob() {
        LocalDate target = LocalDate.now(ZONE).plusDays(DUE_SOON_DAYS);
        List<Installment> due = installmentRepository.findAll(dueSoonSpec(target));
        int enqueued = 0;
        for (Installment i : due) {
            Enrollment e = i.getEnrollment();
            if (e == null) continue;
            Student s = e.getStudent();
            if (s == null || s.getEmail() == null || s.getEmail().isBlank()) {
                log.warn("Skip INSTALLMENT_DUE_SOON: installment={} sin email de alumno", i.getId());
                continue;
            }
            NotificationTemplate tpl = NotificationTemplates.installmentDueSoon(
                    firstName(s), i.getNumber(), i.getDueDate(), i.totalDue());
            notificationService.enqueue(
                    NotificationType.INSTALLMENT_DUE_SOON, s.getEmail(), tpl,
                    RelatedEntityType.INSTALLMENT, i.getId());
            enqueued++;
        }
        log.info("Installment due-soon job: encoladas {} notificaciones (target due_date={})", enqueued, target);
    }

    private static Specification<Installment> dueSoonSpec(LocalDate dueDate) {
        return (root, query, cb) -> cb.and(
                cb.equal(root.get("dueDate"), dueDate),
                cb.equal(root.get("status"), InstallmentStatus.PENDING));
    }

    @Scheduled(fixedDelayString = "${notifications.dispatch-interval-ms:60000}",
               initialDelayString = "${notifications.dispatch-initial-delay-ms:30000}")
    public void dispatchDueJob() {
        int sent = notificationService.dispatchDueBatch();
        if (sent > 0) {
            log.info("Notifications dispatcher: enviadas {}", sent);
        }
    }

    private static String firstName(Student s) {
        return s.getFirstName() != null ? s.getFirstName() : "";
    }
}
