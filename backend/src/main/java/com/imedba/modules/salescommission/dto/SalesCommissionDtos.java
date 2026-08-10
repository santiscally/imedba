package com.imedba.modules.salescommission.dto;

import com.imedba.modules.salescommission.entity.CommissionSourceType;
import com.imedba.modules.salescommission.entity.SalesCommissionStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** DTOs de la liquidación de comisiones de vendedora. */
public final class SalesCommissionDtos {

    private SalesCommissionDtos() {}

    /**
     * Crea el borrador. Las alícuotas y el umbral son opcionales: si no vienen se
     * usan los defaults vigentes (0,5% / 1% / 0,5% / 30) y quedan congelados en la
     * liquidación.
     */
    public record CreateRequest(
            @NotNull UUID sellerUserId,
            String sellerName,
            @NotNull @Min(1) @Max(12) Integer periodMonth,
            @NotNull @Min(2020) @Max(2100) Integer periodYear,

            @DecimalMin("0.00000") @DecimalMax("1.00000") BigDecimal tier1Rate,
            @DecimalMin("0.00000") @DecimalMax("1.00000") BigDecimal tier2Rate,
            @DecimalMin("0.00000") @DecimalMax("1.00000") BigDecimal booksRate,
            @Min(0) Integer tierThreshold,

            String notes) {}

    public record LineResponse(
            UUID id,
            CommissionSourceType sourceType,
            UUID sourceId,
            String studentName,
            String productName,
            LocalDate saleDate,
            Integer saleMonthRank,
            BigDecimal rateApplied,
            BigDecimal collectedAmount,
            BigDecimal commissionAmount,
            boolean fromPriorPeriod) {}

    public record Response(
            UUID id,
            UUID sellerUserId,
            String sellerName,
            Integer periodMonth,
            Integer periodYear,

            BigDecimal tier1Rate,
            BigDecimal tier2Rate,
            BigDecimal booksRate,
            Integer tierThreshold,

            BigDecimal tier1Base,
            BigDecimal tier1Commission,
            BigDecimal tier2Base,
            BigDecimal tier2Commission,
            BigDecimal booksBase,
            BigDecimal booksCommission,
            BigDecimal priorMonthsBase,
            BigDecimal priorMonthsCommission,
            BigDecimal totalCommission,

            SalesCommissionStatus status,
            String notes,
            List<LineResponse> lines,
            Instant createdAt,
            Instant updatedAt) {}

    /**
     * Vendedor con ventas en el período, con el nombre ya resuelto contra Keycloak.
     *
     * <p>Se resuelve en el backend a propósito: {@code GET /api/v1/users} está cerrado
     * con {@code admin:manage}, así que CONTABLE y SECRETARIA_FS —que sí liquidan
     * comisiones— no podrían traducir el UUID a un nombre desde el front.
     *
     * <p>{@code name} puede venir null si la integración admin de Keycloak está apagada
     * o no responde; en ese caso mostrar el id.
     */
    /**
     * Candidato a liquidar. Se ofrecen <b>todos</b> los usuarios, no sólo los que
     * tuvieron movimientos: quien carga las ventas no siempre es la vendedora (en
     * IMEDBA hoy carga el admin), así que restringir la lista escondía liquidaciones
     * que existían. {@code hasActivity} es sólo una ayuda visual del período elegido.
     */
    public record SellerResponse(UUID id, String name, boolean hasActivity) {}

    /** Resumen sin el detalle — para listados. */
    public record SummaryResponse(
            UUID id,
            UUID sellerUserId,
            String sellerName,
            Integer periodMonth,
            Integer periodYear,
            BigDecimal totalCommission,
            SalesCommissionStatus status,
            Instant createdAt) {}
}
