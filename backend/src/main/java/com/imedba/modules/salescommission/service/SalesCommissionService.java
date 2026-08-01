package com.imedba.modules.salescommission.service;

import com.imedba.common.auth.AuthUtils;
import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.booksale.entity.BookSale;
import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.salescommission.dto.SalesCommissionDtos.CreateRequest;
import com.imedba.modules.salescommission.dto.SalesCommissionDtos.Response;
import com.imedba.modules.salescommission.dto.SalesCommissionDtos.SellerResponse;
import com.imedba.modules.salescommission.dto.SalesCommissionDtos.SummaryResponse;
import com.imedba.modules.salescommission.entity.CommissionSourceType;
import com.imedba.modules.salescommission.entity.SalesCommissionLine;
import com.imedba.modules.salescommission.entity.SalesCommissionSettlement;
import com.imedba.modules.salescommission.entity.SalesCommissionStatus;
import com.imedba.modules.salescommission.mapper.SalesCommissionMapper;
import com.imedba.modules.salescommission.repository.CommissionSourceRepository;
import com.imedba.modules.salescommission.repository.SalesCommissionSettlementRepository;
import com.imedba.modules.salescommission.service.SalesCommissionEngine.ComputedLine;
import com.imedba.modules.salescommission.service.SalesCommissionEngine.Params;
import com.imedba.modules.salescommission.service.SalesCommissionEngine.Result;
import com.imedba.modules.salescommission.service.SalesCommissionEngine.Sale;
import com.imedba.modules.useradmin.client.KeycloakAdminClient;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Liquidación de comisiones de vendedora (doc 17 §3.1).
 *
 * <p>A diferencia de las otras dos liquidaciones, esta <b>no requiere carga manual</b>:
 * se deriva entera de datos que ya están en la base — {@code payments} (lo cobrado),
 * {@code book_sales} y {@code enrollments.enrolled_by} (quién vendió). El trabajo que
 * hoy se hace a mano en Excel se reduce a elegir vendedora y período.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SalesCommissionService {

    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    private final SalesCommissionSettlementRepository repository;
    private final CommissionSourceRepository sourceRepository;
    private final SalesCommissionMapper mapper;
    private final KeycloakAdminClient keycloakAdminClient;

    // ─── Comandos ────────────────────────────────────────────────────────────

    public Response createDraft(CreateRequest req) {
        repository.findBySellerUserIdAndPeriodYearAndPeriodMonth(
                        req.sellerUserId(), req.periodYear(), req.periodMonth())
                .ifPresent(s -> {
                    throw new ConflictException("Ya existe una liquidación de comisiones para "
                            + req.periodYear() + "-" + req.periodMonth()
                            + " (id=" + s.getId() + ", status=" + s.getStatus() + ")");
                });

        Params params = new Params(
                req.tier1Rate(), req.tier2Rate(), req.booksRate(), req.tierThreshold())
                .resolved();

        SalesCommissionSettlement settlement = SalesCommissionSettlement.builder()
                .sellerUserId(req.sellerUserId())
                .sellerName(req.sellerName())
                .periodMonth(req.periodMonth())
                .periodYear(req.periodYear())
                .tier1Rate(params.tier1Rate())
                .tier2Rate(params.tier2Rate())
                .booksRate(params.booksRate())
                .tierThreshold(params.tierThreshold())
                .status(SalesCommissionStatus.DRAFT)
                .notes(req.notes())
                .createdBy(AuthUtils.currentUserId().orElse(null))
                .build();

        applyComputation(settlement);
        return mapper.toResponse(repository.save(settlement));
    }

    /** Recalcula un DRAFT: pueden haber entrado cobros nuevos del período. */
    public Response recomputeDraft(UUID id) {
        SalesCommissionSettlement s = find(id);
        if (s.getStatus() != SalesCommissionStatus.DRAFT) {
            throw new ConflictException(
                    "Sólo se puede recalcular mientras la liquidación está en DRAFT (actual: "
                            + s.getStatus() + ")");
        }
        applyComputation(s);
        return mapper.toResponse(s);
    }

    public Response approve(UUID id) {
        SalesCommissionSettlement s = find(id);
        if (s.getStatus() != SalesCommissionStatus.DRAFT) {
            throw new ConflictException(
                    "Sólo se puede aprobar una liquidación en DRAFT (actual: " + s.getStatus() + ")");
        }
        s.setStatus(SalesCommissionStatus.APPROVED);
        return mapper.toResponse(s);
    }

    public Response markPaid(UUID id) {
        SalesCommissionSettlement s = find(id);
        if (s.getStatus() != SalesCommissionStatus.APPROVED) {
            throw new ConflictException(
                    "Sólo se puede marcar PAID una liquidación APPROVED (actual: " + s.getStatus() + ")");
        }
        s.setStatus(SalesCommissionStatus.PAID);
        return mapper.toResponse(s);
    }

    // ─── Consultas ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Response get(UUID id) {
        return mapper.toResponse(find(id));
    }

    @Transactional(readOnly = true)
    public List<SummaryResponse> listBySeller(UUID sellerUserId) {
        return repository.findBySellerUserIdOrderByPeriodYearDescPeriodMonthDesc(sellerUserId)
                .stream().map(mapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public List<SummaryResponse> listByPeriod(int year, int month) {
        return repository.findByPeriodYearAndPeriodMonth(year, month)
                .stream().map(mapper::toSummary).toList();
    }

    /**
     * Vendedores con ventas en el período, con el nombre ya resuelto — para poblar el
     * selector de la pantalla sin que el front necesite {@code admin:manage}.
     */
    @Transactional(readOnly = true)
    public List<SellerResponse> sellersWithActivity(int year, int month) {
        YearMonth period = YearMonth.of(year, month);
        List<UUID> ids = sourceRepository.findSellersWithActivity(
                startOf(period), startOf(period.plusMonths(1)));
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<String, String> names = keycloakAdminClient.displayNamesById();
        return ids.stream()
                .map(id -> new SellerResponse(id, names.get(id.toString())))
                .sorted(Comparator.comparing(
                        s -> s.name() == null ? s.id().toString() : s.name(),
                        String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    /**
     * Vista previa sin persistir: deja ver el número antes de crear el borrador.
     */
    @Transactional(readOnly = true)
    public Response preview(UUID sellerUserId, int year, int month, Params params) {
        SalesCommissionSettlement draft = SalesCommissionSettlement.builder()
                .sellerUserId(sellerUserId)
                .periodMonth(month)
                .periodYear(year)
                .status(SalesCommissionStatus.DRAFT)
                .build();
        Params p = (params == null ? Params.defaults() : params).resolved();
        draft.setTier1Rate(p.tier1Rate());
        draft.setTier2Rate(p.tier2Rate());
        draft.setBooksRate(p.booksRate());
        draft.setTierThreshold(p.tierThreshold());
        applyComputation(draft);
        return mapper.toResponse(draft);
    }

    // ─── Núcleo: junta los datos y corre el motor ────────────────────────────

    private void applyComputation(SalesCommissionSettlement s) {
        YearMonth period = YearMonth.of(s.getPeriodYear(), s.getPeriodMonth());
        List<Sale> sales = gatherSales(s.getSellerUserId(), period);

        Params params = new Params(
                s.getTier1Rate(), s.getTier2Rate(), s.getBooksRate(), s.getTierThreshold());
        Result r = SalesCommissionEngine.compute(period, sales, params);

        s.setTier1Base(r.tier1Base());
        s.setTier1Commission(r.tier1Commission());
        s.setTier2Base(r.tier2Base());
        s.setTier2Commission(r.tier2Commission());
        s.setBooksBase(r.booksBase());
        s.setBooksCommission(r.booksCommission());
        s.setPriorMonthsBase(r.priorMonthsBase());
        s.setPriorMonthsCommission(r.priorMonthsCommission());
        s.setTotalCommission(r.totalCommission());
        s.replaceLines(toEntities(r.lines()));

        log.info("Comisiones {}-{} vendedor {}: {} líneas, total {}",
                s.getPeriodYear(), s.getPeriodMonth(), s.getSellerUserId(),
                r.lines().size(), r.totalCommission());
    }

    /**
     * Arma la entrada del motor:
     * <ul>
     *   <li><b>Inscripciones</b> desde el mes de la venta más antigua que cobró algo en el
     *       período, hasta el fin del período. Se incluyen <b>todas</b> las del rango,
     *       incluso las que no cobraron nada, porque ocupan lugar en el ranking de su mes
     *       y por lo tanto corren la alícuota de las que vienen después.</li>
     *   <li><b>Ventas de libros sueltos</b> del período: se cobran de una sola vez, así que
     *       sólo generan comisión en su propio mes.</li>
     * </ul>
     *
     * <p>La ventana se deriva de los datos en vez de ser una constante: cualquier cobro
     * cuya inscripción quedara fuera del rango desaparecería del cálculo en silencio. Y
     * arranca en el <b>primer día de ese mes</b> —no en la fecha exacta de la venta— para
     * que el ranking de ese mes esté completo; si no, una venta vieja entraría rankeada 1ª
     * y cobraría la alícuota baja cuando en realidad le tocaba la alta.
     */
    private List<Sale> gatherSales(UUID seller, YearMonth period) {
        Instant periodStart = startOf(period);
        Instant periodEnd = startOf(period.plusMonths(1));

        Map<UUID, BigDecimal> collected = new HashMap<>();
        for (Object[] row : sourceRepository.sumCollectedByEnrollment(seller, periodStart, periodEnd)) {
            collected.put((UUID) row[0], (BigDecimal) row[1]);
        }

        Instant cohortStart = cohortStart(seller, period, periodStart, periodEnd);

        List<Sale> sales = new ArrayList<>();

        for (Enrollment e : sourceRepository.findEnrollmentsBySeller(seller, cohortStart, periodEnd)) {
            sales.add(new Sale(
                    e.getId(),
                    CommissionSourceType.ENROLLMENT,
                    toLocalDate(e.getEnrollmentDate()),
                    studentName(e),
                    e.getCourse() == null ? null : e.getCourse().getName(),
                    collected.getOrDefault(e.getId(), BigDecimal.ZERO)));
        }

        for (BookSale bs : sourceRepository.findBookSalesBySeller(seller, periodStart, periodEnd)) {
            sales.add(new Sale(
                    bs.getId(),
                    CommissionSourceType.BOOK_SALE,
                    toLocalDate(bs.getSaleDate()),
                    bs.getStudent() == null ? null
                            : bs.getStudent().getFirstName() + " " + bs.getStudent().getLastName(),
                    bs.getBook() == null ? null : bs.getBook().getName(),
                    bs.getTotalAmount()));
        }

        return sales;
    }

    /**
     * Primer instante del mes de la venta más antigua que cobró algo en el período.
     * Si no hubo cobros de cohortes previas, arranca en el propio período.
     */
    private Instant cohortStart(UUID seller, YearMonth period, Instant periodStart, Instant periodEnd) {
        Instant earliest = sourceRepository.earliestSaleDateCollectingBetween(
                seller, periodStart, periodEnd);
        if (earliest == null) {
            return periodStart;
        }
        YearMonth earliestMonth = YearMonth.from(LocalDate.ofInstant(earliest, ZONE));
        return earliestMonth.isBefore(period) ? startOf(earliestMonth) : periodStart;
    }

    private List<SalesCommissionLine> toEntities(List<ComputedLine> lines) {
        List<SalesCommissionLine> out = new ArrayList<>(lines.size());
        for (ComputedLine l : lines) {
            out.add(SalesCommissionLine.builder()
                    .sourceType(l.sourceType())
                    .sourceId(l.sourceId())
                    .studentName(l.studentName())
                    .productName(l.productName())
                    .saleDate(l.saleDate())
                    .saleMonthRank(l.saleMonthRank())
                    .rateApplied(l.rateApplied())
                    .collectedAmount(l.collectedAmount())
                    .commissionAmount(l.commissionAmount())
                    .fromPriorPeriod(l.fromPriorPeriod())
                    .build());
        }
        return out;
    }

    private static String studentName(Enrollment e) {
        if (e.getStudent() == null) return null;
        return e.getStudent().getFirstName() + " " + e.getStudent().getLastName();
    }

    private static Instant startOf(YearMonth ym) {
        return ym.atDay(1).atStartOfDay(ZONE).toInstant();
    }

    private static LocalDate toLocalDate(Instant instant) {
        return instant == null ? null : LocalDate.ofInstant(instant, ZONE);
    }

    private SalesCommissionSettlement find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("SalesCommissionSettlement", id));
    }
}
