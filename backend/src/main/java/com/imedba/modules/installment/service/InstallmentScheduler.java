package com.imedba.modules.installment.service;

import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import com.imedba.modules.installment.repository.InstallmentRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tareas programadas de la fase 2 — cobranza.
 *
 * Se ejecutan en horario Buenos Aires (ver propiedades de Spring):
 *   - Recargos:       06:00 — aplica 5% a cuotas con >10 días de mora sin recargo.
 *   - Suspensión LMS: 06:10 — marca {@code enrollment.moodleStatus = 'SUSPENDED'} a los 22 días.
 *
 * La notificación "a 2 días de suspensión" (día 20) queda a cargo de Fase 3 (SendGrid).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InstallmentScheduler {

    /** Días desde el vencimiento a partir de los cuales se marca Moodle como suspendido. */
    public static final int MOODLE_SUSPEND_DAYS = 22;

    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final String MOODLE_SUSPENDED = "SUSPENDED";

    private final InstallmentRepository installmentRepository;
    private final InstallmentService installmentService;

    /**
     * Todos los días a las 06:00 (zona {@link #ZONE}): aplica recargos a las cuotas que ya
     * tienen más de 10 días de mora y siguen en PENDING.
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
     * cuyas cuotas están OVERDUE hace >= {@value #MOODLE_SUSPEND_DAYS} días.
     *
     * El sync real con Moodle es fase 7 — acá sólo se levanta la bandera que el cron de
     * integración consumirá.
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
            }
        }
        log.info("Moodle suspension job: flagged {} enrollments as SUSPENDED (cutoff={})",
                flagged, suspendOnOrBefore);
    }
}
