package com.imedba.modules.installment.service;

import com.imedba.modules.course.entity.Course;
import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import com.imedba.modules.installment.repository.InstallmentRepository;
import com.imedba.modules.moodle.service.MoodleService;
import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.entity.RelatedEntityType;
import com.imedba.modules.notification.service.NotificationService;
import com.imedba.modules.notification.template.NotificationTemplate;
import com.imedba.modules.notification.template.NotificationTemplates;
import com.imedba.modules.notification.whatsapp.WhatsAppSender;
import com.imedba.modules.student.entity.Student;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tareas programadas de la fase 2 — cobranza.
 *
 * Se ejecutan en horario Buenos Aires (ver propiedades de Spring):
 *   - Recargos:       06:00 — aplica 5% a cuotas vencidas (día siguiente al vencimiento) sin recargo.
 *   - Suspensión LMS: 06:10 — marca {@code enrollment.moodleStatus = 'SUSPENDED'} a los 12 días del vencimiento.
 *
 * Modelo "día del mes" (reunión 2026-06-05): el vencimiento es el día 10 (GROUP_1) o 20 (GROUP_2),
 * el recargo corre al día siguiente (11 / 21) y la suspensión a los 12 días (día 22 para GROUP_1).
 * La notificación "a 2 días de suspensión" queda a cargo de Fase 3 (SendGrid).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InstallmentScheduler {

    /**
     * Días desde el vencimiento a partir de los cuales se marca Moodle como suspendido.
     * Vencimiento día 10 (GROUP_1) + 12 = día 22 (CLAUDE.md). GROUP_2 (venc. día 20): equivalente.
     */
    public static final int MOODLE_SUSPEND_DAYS = 12;

    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final String MOODLE_SUSPENDED = "SUSPENDED";

    private final InstallmentRepository installmentRepository;
    private final InstallmentService installmentService;
    private final MoodleService moodleService;
    private final NotificationService notificationService;
    private final WhatsAppSender whatsAppSender;

    /**
     * Catch-up al arrancar la app: los crons de las 06:00/06:10 NO se recuperan si la app
     * estaba apagada a esa hora (Spring no hace catch-up de corridas perdidas). Sin esto,
     * en dev (stack prendido a demanda) las cuotas vencidas quedaban PENDING para siempre
     * y nunca se aplicaba recargo ni suspensión (testeo integral 2026-06-09).
     * Ambos jobs son idempotentes, así que correrlos de más no duplica efectos.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void catchUpOnStartup() {
        log.info("Installment catch-up al startup: corriendo jobs de recargo y suspensión");
        applySurchargesJob();
        flagMoodleSuspensionsJob();
    }

    /**
     * Todos los días a las 06:00 (zona {@link #ZONE}): aplica recargos a las cuotas vencidas
     * (al día siguiente del vencimiento, ver {@link InstallmentService#SURCHARGE_GRACE_DAYS})
     * que siguen en PENDING.
     */
    @Scheduled(cron = "0 0 6 * * *", zone = "America/Argentina/Buenos_Aires")
    @Transactional
    public void applySurchargesJob() {
        LocalDate today = LocalDate.now(ZONE);
        LocalDate cutoff = today.minusDays(InstallmentService.SURCHARGE_GRACE_DAYS);
        List<Installment> due = installmentRepository.findOverduePending(cutoff);
        if (due.isEmpty()) {
            log.debug("Surcharge job: no overdue installments to process");
            return;
        }
        int applied = 0;
        for (Installment i : due) {
            if (i.getSurchargeAmount().signum() == 0
                    && i.getStatus() == InstallmentStatus.PENDING) {
                installmentService.applySurcharge(i);
                applied++;
            }
        }
        log.info("Surcharge job: applied 5% surcharge to {} installments (cutoff={})", applied, cutoff);
    }

    /**
     * Todos los días a las 06:10: marca {@code moodleStatus=SUSPENDED} en las inscripciones
     * cuyas cuotas están OVERDUE hace >= {@value #MOODLE_SUSPEND_DAYS} días y, para cada una
     * recién suspendida, dispara los efectos: suspensión real en Moodle (no-op si
     * {@code moodle.enabled=false}) + notificación al alumno (mail + WhatsApp).
     *
     * <p>Cada efecto va dentro de su propio try/catch para que un fallo (red Moodle, mail)
     * no aborte el batch ni revierta el flag en DB.</p>
     *
     * <p>NOTA: cuando la integración Moodle se prenda en prod, conviene mover la llamada de
     * red FUERA de esta {@code @Transactional} (hoy se hace I/O con la conexión DB tomada).
     * Mientras está deshabilitada es un no-op, así que no aplica.</p>
     */
    @Scheduled(cron = "0 10 6 * * *", zone = "America/Argentina/Buenos_Aires")
    @Transactional
    public void flagMoodleSuspensionsJob() {
        LocalDate today = LocalDate.now(ZONE);
        LocalDate suspendOnOrBefore = today.minusDays(MOODLE_SUSPEND_DAYS);
        List<Installment> toSuspend = installmentRepository.findOverdueBetween(
                LocalDate.of(1970, 1, 1), suspendOnOrBefore);
        int flagged = 0;
        for (Installment i : toSuspend) {
            Enrollment e = i.getEnrollment();
            if (e != null && !MOODLE_SUSPENDED.equals(e.getMoodleStatus())) {
                e.setMoodleStatus(MOODLE_SUSPENDED);
                flagged++;
                onSuspended(e);
            }
        }
        log.info("Moodle suspension job: flagged {} enrollments as SUSPENDED (cutoff={})",
                flagged, suspendOnOrBefore);
    }

    /** Efectos al suspender una inscripción: Moodle + notificación (mail + WhatsApp). Best-effort. */
    private void onSuspended(Enrollment e) {
        Student s = e.getStudent();
        Course c = e.getCourse();
        String courseName = c != null && c.getName() != null ? c.getName() : "el curso";

        try {
            moodleService.suspendStudent(s);
        } catch (Exception ex) {
            log.warn("No se pudo suspender en Moodle (enrollment={}): {}", e.getId(), ex.getMessage());
        }

        if (s == null) {
            return;
        }
        if (s.getEmail() != null && !s.getEmail().isBlank()) {
            try {
                NotificationTemplate tpl = NotificationTemplates.suspended(firstName(s), courseName);
                notificationService.enqueue(
                        NotificationType.SUSPENDED, s.getEmail(), tpl,
                        RelatedEntityType.ENROLLMENT, e.getId());
            } catch (Exception ex) {
                log.warn("No se pudo encolar mail SUSPENDED (enrollment={}): {}", e.getId(), ex.getMessage());
            }
        }
        if (s.getPhone() != null && !s.getPhone().isBlank()) {
            try {
                whatsAppSender.send(s.getPhone(),
                        "Hola " + firstName(s) + ", tu acceso a " + courseName
                                + " en Moodle fue suspendido por cuotas impagas. Contactá a administración para reactivarlo.");
            } catch (Exception ex) {
                log.warn("No se pudo enviar WhatsApp SUSPENDED (enrollment={}): {}", e.getId(), ex.getMessage());
            }
        }
    }

    private static String firstName(Student s) {
        return s.getFirstName() != null ? s.getFirstName() : "";
    }
}
