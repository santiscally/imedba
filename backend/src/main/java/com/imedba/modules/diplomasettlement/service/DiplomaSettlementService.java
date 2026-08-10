package com.imedba.modules.diplomasettlement.service;

import com.imedba.common.auth.AuthUtils;
import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.budget.entity.BudgetCategory;
import com.imedba.modules.budget.entity.BudgetEntry;
import com.imedba.modules.budget.entity.BusinessUnit;
import com.imedba.modules.budget.entity.EntryType;
import com.imedba.modules.budget.repository.BudgetEntryRepository;
import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.diploma.service.DiplomaService;
import com.imedba.modules.diplomasettlement.dto.DiplomaSettlementCreateRequest;
import com.imedba.modules.diplomasettlement.dto.DiplomaSettlementResponse;
import com.imedba.modules.diplomasettlement.entity.DiplomaSettlement;
import com.imedba.modules.diplomasettlement.entity.DirectorDistribution;
import com.imedba.modules.diplomasettlement.entity.SettlementStatus;
import com.imedba.modules.diplomasettlement.mapper.DiplomaSettlementMapper;
import com.imedba.modules.diplomasettlement.repository.DiplomaSettlementRepository;
import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.entity.RelatedEntityType;
import com.imedba.modules.notification.service.NotificationService;
import com.imedba.modules.notification.template.NotificationTemplate;
import com.imedba.modules.notification.template.NotificationTemplates;
import com.imedba.modules.payment.repository.PaymentRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import com.imedba.common.pdf.PdfFile;
import com.imedba.common.pdf.SettlementDocs;
import com.imedba.common.pdf.SettlementPdfRenderer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class DiplomaSettlementService {

    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    private final DiplomaSettlementRepository repository;
    private final DiplomaSettlementMapper mapper;
    private final DiplomaService diplomaService;
    private final NotificationService notificationService;
    private final PaymentRepository paymentRepository;
    private final BudgetEntryRepository budgetEntryRepository;
    private final SettlementPdfRenderer pdfRenderer;

    public DiplomaSettlementResponse createDraft(DiplomaSettlementCreateRequest req) {
        repository.findByDiplomaIdAndPeriodYearAndPeriodMonth(
                        req.diplomaId(), req.periodYear(), req.periodMonth())
                .ifPresent(s -> {
                    throw new ConflictException("Ya existe una liquidación para " +
                            req.periodYear() + "-" + req.periodMonth() +
                            " (id=" + s.getId() + ", status=" + s.getStatus() + ")");
                });

        Diploma d = diplomaService.findEntity(req.diplomaId());

        // totalCollected: si no viene, se suma automáticamente lo cobrado en el período
        // por las inscripciones del curso vinculado a la diplomatura (V026).
        BigDecimal total = req.totalCollected() != null
                ? req.totalCollected()
                : collectedForPeriod(d, req.periodYear(), req.periodMonth());

        SettlementEngine.Inputs inputs = new SettlementEngine.Inputs(
                req.taxPct(), req.secretaryAmount(), req.advertisingAmount(),
                req.administrationAmount(), req.miscExpensesAmount(), req.recordingsAmount(),
                req.imedbaPct(), req.untrefPct());
        DiplomaSettlement settlement = SettlementEngine.compute(
                d, req.periodYear(), req.periodMonth(), total, d.getDirectors(), inputs);
        settlement.setStatus(SettlementStatus.DRAFT);
        settlement.setCreatedBy(AuthUtils.requireCurrentUserId());
        return mapper.toResponse(repository.save(settlement));
    }

    public DiplomaSettlementResponse recomputeDraft(UUID id) {
        DiplomaSettlement existing = find(id);
        if (existing.getStatus() != SettlementStatus.DRAFT) {
            throw new ConflictException(
                    "Sólo se puede recalcular mientras la liquidación está en DRAFT");
        }
        // Recompute usa los inputs persistidos en el settlement (ya cargados por createDraft).
        // Si la diplomatura tiene curso vinculado, refresca también el totalCollected desde
        // los pagos (pueden haber entrado cobros nuevos del período desde que se creó el draft).
        if (existing.getDiploma() != null && existing.getDiploma().getCourse() != null) {
            existing.setTotalCollected(collectedForPeriod(
                    existing.getDiploma(), existing.getPeriodYear(), existing.getPeriodMonth()));
        }
        SettlementEngine.Inputs inputs = new SettlementEngine.Inputs(
                existing.getInputTaxCommissionPct(), existing.getInputSecretarySalary(),
                existing.getInputAdvertisingAmount(), existing.getInputAdministrationAmount(),
                existing.getInputMiscExpensesAmount(), existing.getInputRecordingsAmount(),
                existing.getInputImedbaPct(), existing.getInputUntrefPct());
        DiplomaSettlement recomputed = SettlementEngine.compute(
                existing.getDiploma(),
                existing.getPeriodYear(),
                existing.getPeriodMonth(),
                existing.getTotalCollected(),
                existing.getDiploma() == null ? List.of() : existing.getDiploma().getDirectors(),
                inputs);
        existing.setTaxCommissionAmount(recomputed.getTaxCommissionAmount());
        existing.setSubtotal1(recomputed.getSubtotal1());
        existing.setSecretaryAmount(recomputed.getSecretaryAmount());
        existing.setAdvertisingAmount(recomputed.getAdvertisingAmount());
        existing.setAdministrationAmount(recomputed.getAdministrationAmount());
        existing.setMiscExpensesAmount(recomputed.getMiscExpensesAmount());
        existing.setSubtotal2(recomputed.getSubtotal2());
        existing.setHalfAmount(recomputed.getHalfAmount());
        existing.setRecordingsAmount(recomputed.getRecordingsAmount());
        existing.setDirectorsBaseAmount(recomputed.getDirectorsBaseAmount());
        existing.setImedbaAmount(recomputed.getImedbaAmount());
        existing.setUntrefAmount(recomputed.getUntrefAmount());
        existing.setDirectorsDistribution(recomputed.getDirectorsDistribution());
        return mapper.toResponse(existing);
    }

    public DiplomaSettlementResponse approve(UUID id) {
        DiplomaSettlement s = find(id);
        if (s.getStatus() != SettlementStatus.DRAFT) {
            throw new ConflictException(
                    "Sólo se puede aprobar una liquidación en DRAFT (actual: " + s.getStatus() + ")");
        }
        s.setStatus(SettlementStatus.APPROVED);
        enqueueDirectorNotifications(s);
        return mapper.toResponse(s);
    }

    /**
     * Encola un email por cada directora con el monto a facturar (reunión 2026-05-22 §2.6).
     *
     * <p>Pasamos {@code relatedEntityId = null} a propósito para esquivar la dedup
     * de {@link NotificationService#enqueue} (que rechaza el mismo {@code (type, relatedEntityType,
     * relatedEntityId)} si ya hay una QUEUED/SENT) — sin eso, sólo el primer partner recibiría email.
     * El contexto queda en el subject/body del template.
     */
    private void enqueueDirectorNotifications(DiplomaSettlement s) {
        List<DirectorDistribution> directors = s.getDirectorsDistribution();
        if (directors == null || directors.isEmpty()) {
            return;
        }
        String diplomaName = s.getDiploma() != null ? s.getDiploma().getName() : "";
        for (DirectorDistribution p : directors) {
            if (p.email() == null || p.email().isBlank() || p.amount() == null
                    || p.amount().signum() <= 0) {
                continue;
            }
            // Plantilla de Nico (2026-07-31): «Imedba - Formación Superior Honorarios».
            NotificationTemplate tpl = NotificationTemplates.diplomaSettlementInvoiceRequest(
                    p.greetingName(),
                    s.getPeriodMonth(), s.getPeriodYear(),
                    p.amount());
            notificationService.enqueue(
                    NotificationType.SETTLEMENT_APPROVED, p.email(), tpl,
                    RelatedEntityType.DIPLOMA_SETTLEMENT, null);
        }
    }

    public DiplomaSettlementResponse markPaid(UUID id) {
        DiplomaSettlement s = find(id);
        if (s.getStatus() != SettlementStatus.APPROVED) {
            throw new ConflictException(
                    "Sólo se puede marcar PAID una liquidación APPROVED (actual: " + s.getStatus() + ")");
        }
        s.setStatus(SettlementStatus.PAID);
        createBudgetExpenses(s);
        return mapper.toResponse(s);
    }

    // ─── totalCollected automático (V026) ────────────────────────────────────

    /**
     * Total cobrado en el período por las inscripciones del curso vinculado a la
     * diplomatura. Null si la diplomatura no tiene curso vinculado (el engine lo
     * trata como 0; en ese caso conviene cargar el total a mano).
     */
    private BigDecimal collectedForPeriod(Diploma d, int year, int month) {
        if (d == null || d.getCourse() == null) {
            return null;
        }
        LocalDate first = LocalDate.of(year, month, 1);
        return paymentRepository.sumByCourseBetween(
                d.getCourse().getId(),
                first.atStartOfDay(ZONE).toInstant(),
                first.plusMonths(1).atStartOfDay(ZONE).toInstant());
    }

    // ─── Egresos en Presupuesto al marcar PAID ───────────────────────────────

    /**
     * La liquidación pagada ES plata que sale (pedido 2026-06-09: "cuando liquidás
     * debería quedar como un egreso"). Genera un asiento EXPENSE por cada componente
     * que se le paga a un tercero, en la unidad FORMACION_SUPERIOR y el período de
     * la liquidación. La porción IMEDBA no se asienta: es lo que queda en la casa.
     *
     * <p>Idempotente por diseño: markPaid sólo transiciona APPROVED→PAID una vez.</p>
     */
    private void createBudgetExpenses(DiplomaSettlement s) {
        String diplomaName = s.getDiploma() != null ? s.getDiploma().getName() : "";
        String period = String.format("%02d/%d", s.getPeriodMonth(), s.getPeriodYear());
        String prefix = "Liquidación " + diplomaName + " " + period;

        int created = 0;
        created += expense(s, BudgetCategory.TAXES, prefix + " — Impuestos y gastos bancarios",
                s.getTaxCommissionAmount());
        created += expense(s, BudgetCategory.SALARIES, prefix + " — Sueldo secretaría",
                s.getSecretaryAmount());
        created += expense(s, BudgetCategory.ADVERTISING, prefix + " — Publicidad",
                s.getAdvertisingAmount());
        created += expense(s, BudgetCategory.OTHER, prefix + " — Administración",
                s.getAdministrationAmount());
        created += expense(s, BudgetCategory.OTHER, prefix + " — Gastos varios",
                s.getMiscExpensesAmount());
        created += expense(s, BudgetCategory.OTHER, prefix + " — Grabaciones docentes",
                s.getRecordingsAmount());
        // UNTREF NO se asienta: no se paga este mes, se acumula hasta que cierre la
        // comisión (reunión 2026-07-24, 19:42). Cuando se implemente el pago del
        // acumulado, el egreso se genera ahí — asentarlo acá lo duplicaría.
        if (s.getDirectorsDistribution() != null) {
            for (DirectorDistribution p : s.getDirectorsDistribution()) {
                created += expense(s, BudgetCategory.SUPPLIERS,
                        prefix + " — Directora " + (p.name() != null ? p.name() : ""),
                        p.amount());
            }
        }
        log.info("Liquidación {} marcada PAID: {} egresos asentados en Presupuesto", s.getId(), created);
    }

    private int expense(DiplomaSettlement s, BudgetCategory category, String concept, BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            return 0;
        }
        budgetEntryRepository.save(BudgetEntry.builder()
                .entryType(EntryType.EXPENSE)
                .category(category)
                .subcategory("Liquidación diplomatura")
                .businessUnit(BusinessUnit.FORMACION_SUPERIOR)
                .concept(concept)
                .amount(amount)
                .entryDate(LocalDate.now(ZONE))
                .periodMonth(s.getPeriodMonth())
                .periodYear(s.getPeriodYear())
                .referenceNumber("LIQ-" + s.getId())
                .registeredBy(AuthUtils.requireCurrentUserId())
                .build());
        return 1;
    }

    @Transactional(readOnly = true)
    public DiplomaSettlementResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    @Transactional(readOnly = true)
    public List<DiplomaSettlementResponse> listByDiploma(UUID diplomaId) {
        return repository.findByDiplomaIdOrderByPeriodYearDescPeriodMonthDesc(diplomaId).stream()
                .map(mapper::toResponse)
                .toList();
    }

    private DiplomaSettlement find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("DiplomaSettlement", id));
    }

    /**
     * Comprobante en PDF de la liquidación (pedido 2026-08-03). Sólo cuando está
     * <b>pagada</b>: es el respaldo de un pago hecho, no un borrador. No recalcula
     * nada — muestra los importes congelados al liquidar.
     */
    public PdfFile renderPdf(UUID id) {
        var s = find(id);
        if (s.getStatus() != SettlementStatus.PAID) {
            throw new ConflictException(
                    "El comprobante se genera cuando la liquidación está pagada (actual: "
                    + s.getStatus() + ")");
        }
        String who = PdfFile.slug(s.getDiploma() != null ? s.getDiploma().getName() : "diplomatura");
        String name = "liquidacion-diplomatura-" + who + "-"
                + s.getPeriodYear() + "-" + String.format("%02d", s.getPeriodMonth()) + ".pdf";
        return new PdfFile(name, pdfRenderer.render(SettlementDocs.ofDiploma(s)));
    }
}
