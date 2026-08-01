package com.imedba.modules.teaching.dto;

import com.imedba.modules.teaching.entity.TeachingRole;
import com.imedba.modules.teaching.entity.TeachingSettlementStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** DTOs de la grilla de clases y de la liquidación docente (V037). */
public final class TeachingDtos {

    private TeachingDtos() {}

    // ─── Grilla de clases ────────────────────────────────────────────────────

    public record ClassSessionRequest(
            @NotNull LocalDate sessionDate,
            @Size(max = 100) String commission,
            @Size(max = 200) String subject,
            @Size(max = 300) String classLabel,
            /** null = true. Las asincrónicas no entran en la liquidación. */
            Boolean synchronous,
            @Size(max = 50)  String scheduledTime,
            @Size(max = 200) String zoomAccount,
            @Size(max = 500) String sessionLink,
            /** Nullable: hay clases sin docente asignada (cierres de módulo). */
            UUID teacherId,
            /** Se asigna por clase; puede no ser la misma persona que la docente. */
            UUID preceptorId,
            @DecimalMin("0.00") BigDecimal actualHours,
            /** Lo completa Cobranzas. null = la liquidación usa actualHours. */
            @DecimalMin("0.00") BigDecimal hoursToPay,
            String notes) {}

    public record ClassSessionResponse(
            UUID id,
            LocalDate sessionDate,
            String commission,
            String subject,
            String classLabel,
            Boolean synchronous,
            String scheduledTime,
            String zoomAccount,
            String sessionLink,
            UUID teacherId,
            String teacherName,
            UUID preceptorId,
            String preceptorName,
            BigDecimal actualHours,
            BigDecimal hoursToPay,
            String notes,
            Instant createdAt,
            Instant updatedAt) {}

    /** Carga masiva de `hours_to_pay` — es lo que hace Cobranzas al cerrar el mes. */
    public record HoursToPayRequest(
            @NotNull UUID sessionId,
            @DecimalMin("0.00") BigDecimal hoursToPay) {}

    // ─── Liquidación ─────────────────────────────────────────────────────────

    /** Persona con clases en el período, con el rol en el que participó. */
    public record TeachingCandidate(
            UUID staffId,
            String staffName,
            TeachingRole role,
            int classCount,
            boolean paidByHours,
            boolean alreadySettled) {}

    public record CreateRequest(
            @NotNull UUID staffId,
            @NotNull TeachingRole role,
            @NotNull @Min(1) @Max(12) Integer periodMonth,
            @NotNull @Min(2020) @Max(2100) Integer periodYear,
            /** null = usa el valor hora vigente del rol. */
            @DecimalMin("0.00") BigDecimal hourlyRate,
            String notes) {}

    public record LineResponse(
            UUID id,
            UUID classSessionId,
            LocalDate sessionDate,
            String commission,
            String subject,
            String classLabel,
            BigDecimal hoursPaid) {}

    public record Response(
            UUID id,
            UUID staffId,
            String staffName,
            Integer periodYear,
            Integer periodMonth,
            TeachingRole role,
            BigDecimal hourlyRate,
            BigDecimal perClassBonusHours,
            Integer classCount,
            BigDecimal totalHours,
            BigDecimal bonusHours,
            BigDecimal billableHours,
            BigDecimal totalAmount,
            Instant invoiceEmailSentAt,
            Boolean invoiceReceived,
            Instant paidAt,
            TeachingSettlementStatus status,
            String notes,
            List<LineResponse> lines,
            Instant createdAt,
            Instant updatedAt) {}

    public record SummaryResponse(
            UUID id,
            UUID staffId,
            String staffName,
            Integer periodYear,
            Integer periodMonth,
            TeachingRole role,
            Integer classCount,
            BigDecimal billableHours,
            BigDecimal totalAmount,
            TeachingSettlementStatus status) {}
}
