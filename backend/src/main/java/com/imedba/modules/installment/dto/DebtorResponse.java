package com.imedba.modules.installment.dto;

import com.imedba.modules.enrollment.entity.PaymentGroup;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Deudor agrupado por inscripción: un alumno (en un curso) con todas sus cuotas
 * impagas (PENDING/OVERDUE) juntas. Alimenta la vista "agrupar pendientes por alumno"
 * de Cuotas (reunión 2026-06-05). Paginado por deudor, no por cuota.
 */
public record DebtorResponse(
        UUID enrollmentId,
        UUID studentId,
        String studentName,
        String studentPhone,       // para el link de WhatsApp manual (aviso de cuota vencida)
        UUID courseId,
        String courseName,
        String courseCode,
        PaymentGroup paymentGroup,
        LocalDate nextDueDate,
        BigDecimal totalOwed,
        int pendingCount,
        List<InstallmentResponse> installments
) {}
