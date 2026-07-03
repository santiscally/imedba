package com.imedba.modules.notification;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.installment.entity.Installment;
import com.imedba.modules.installment.entity.InstallmentStatus;
import com.imedba.modules.installment.repository.InstallmentRepository;
import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.entity.RelatedEntityType;
import com.imedba.modules.notification.scheduler.NotificationScheduler;
import com.imedba.modules.notification.service.NotificationService;
import com.imedba.modules.notification.template.NotificationTemplate;
import com.imedba.modules.student.entity.Student;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

/**
 * Tests del job "alerta día 1" (recordatorio de cuota que vence mañana). Repo y service son mocks.
 */
@ExtendWith(MockitoExtension.class)
class NotificationSchedulerTests {

    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    @Mock private InstallmentRepository installmentRepository;
    @Mock private NotificationService notificationService;

    @Test
    @DisplayName("due-soon: encola INSTALLMENT_DUE_SOON para la cuota con email de alumno")
    void due_soon_enqueues_for_installment_with_email() {
        Installment i = installmentDueTomorrow("ana@example.com", "Ana");
        when(installmentRepository.findAll(any(Specification.class))).thenReturn(List.of(i));

        scheduler().enqueueInstallmentDueSoonJob();

        verify(notificationService).enqueue(
                eq(NotificationType.INSTALLMENT_DUE_SOON), eq("ana@example.com"),
                any(NotificationTemplate.class),
                eq(RelatedEntityType.INSTALLMENT), eq(i.getId()));
    }

    @Test
    @DisplayName("due-soon: saltea la cuota cuyo alumno no tiene email")
    void due_soon_skips_when_no_email() {
        Installment i = installmentDueTomorrow(null, "Sin Mail");
        when(installmentRepository.findAll(any(Specification.class))).thenReturn(List.of(i));

        scheduler().enqueueInstallmentDueSoonJob();

        verify(notificationService, never()).enqueue(any(), any(), any(), any(), any());
    }

    private NotificationScheduler scheduler() {
        return new NotificationScheduler(installmentRepository, notificationService);
    }

    private static Installment installmentDueTomorrow(String email, String firstName) {
        Student s = Student.builder().firstName(firstName).email(email).build();
        Enrollment e = Enrollment.builder().student(s).build();
        Installment i = Installment.builder()
                .number(1)
                .amount(new BigDecimal("10000.00"))
                .dueDate(LocalDate.now(ZONE).plusDays(1))
                .status(InstallmentStatus.PENDING)
                .enrollment(e)
                .build();
        i.setId(UUID.randomUUID());
        return i;
    }
}
