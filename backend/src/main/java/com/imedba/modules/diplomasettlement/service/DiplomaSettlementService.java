package com.imedba.modules.diplomasettlement.service;

import com.imedba.common.auth.AuthUtils;
import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.diploma.service.DiplomaService;
import com.imedba.modules.diplomasettlement.dto.DiplomaSettlementCreateRequest;
import com.imedba.modules.diplomasettlement.dto.DiplomaSettlementResponse;
import com.imedba.modules.diplomasettlement.entity.DiplomaSettlement;
import com.imedba.modules.diplomasettlement.entity.PartnerDistribution;
import com.imedba.modules.diplomasettlement.entity.SettlementStatus;
import com.imedba.modules.diplomasettlement.mapper.DiplomaSettlementMapper;
import com.imedba.modules.diplomasettlement.repository.DiplomaSettlementRepository;
import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.entity.RelatedEntityType;
import com.imedba.modules.notification.service.NotificationService;
import com.imedba.modules.notification.template.NotificationTemplate;
import com.imedba.modules.notification.template.NotificationTemplates;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class DiplomaSettlementService {

    private final DiplomaSettlementRepository repository;
    private final DiplomaSettlementMapper mapper;
    private final DiplomaService diplomaService;
    private final NotificationService notificationService;

    public DiplomaSettlementResponse createDraft(DiplomaSettlementCreateRequest req) {
        repository.findByDiplomaIdAndPeriodYearAndPeriodMonth(
                        req.diplomaId(), req.periodYear(), req.periodMonth())
                .ifPresent(s -> {
                    throw new ConflictException("Ya existe una liquidación para " +
                            req.periodYear() + "-" + req.periodMonth() +
                            " (id=" + s.getId() + ", status=" + s.getStatus() + ")");
                });

        Diploma d = diplomaService.findEntity(req.diplomaId());
        SettlementEngine.Inputs inputs = new SettlementEngine.Inputs(
                req.taxCommissionPct(), req.secretarySalary(), req.advertisingAmount(),
                req.adminPct(), req.universityPct(), req.imedbaPct());
        DiplomaSettlement settlement = SettlementEngine.compute(
                d, req.periodYear(), req.periodMonth(), req.totalCollected(), inputs);
        settlement.setStatus(SettlementStatus.DRAFT);
        settlement.setCreatedBy(AuthUtils.currentUserId().orElse(null));
        return mapper.toResponse(repository.save(settlement));
    }

    public DiplomaSettlementResponse recomputeDraft(UUID id) {
        DiplomaSettlement existing = find(id);
        if (existing.getStatus() != SettlementStatus.DRAFT) {
            throw new ConflictException(
                    "Sólo se puede recalcular mientras la liquidación está en DRAFT");
        }
        // Recompute usa los inputs persistidos en el settlement (ya cargados por createDraft).
        SettlementEngine.Inputs inputs = new SettlementEngine.Inputs(
                existing.getInputTaxCommissionPct(), existing.getInputSecretarySalary(),
                existing.getInputAdvertisingAmount(), existing.getInputAdminPct(),
                existing.getInputUniversityPct(), existing.getInputImedbaPct());
        DiplomaSettlement recomputed = SettlementEngine.compute(
                existing.getDiploma(),
                existing.getPeriodYear(),
                existing.getPeriodMonth(),
                existing.getTotalCollected(),
                inputs);
        existing.setTaxCommissionAmount(recomputed.getTaxCommissionAmount());
        existing.setSecretaryAmount(recomputed.getSecretaryAmount());
        existing.setAdvertisingAmount(recomputed.getAdvertisingAmount());
        existing.setAdminAmount(recomputed.getAdminAmount());
        existing.setUniversityAmount(recomputed.getUniversityAmount());
        existing.setImedbaAmount(recomputed.getImedbaAmount());
        existing.setPartnersTotal(recomputed.getPartnersTotal());
        existing.setPartnersDistribution(recomputed.getPartnersDistribution());
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
        List<PartnerDistribution> partners = s.getPartnersDistribution();
        if (partners == null || partners.isEmpty()) {
            return;
        }
        String diplomaName = s.getDiploma() != null ? s.getDiploma().getName() : "";
        for (PartnerDistribution p : partners) {
            if (p.email() == null || p.email().isBlank() || p.amount() == null
                    || p.amount().signum() <= 0) {
                continue;
            }
            NotificationTemplate tpl = NotificationTemplates.settlementApproved(
                    p.name() != null ? p.name() : "",
                    diplomaName,
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
        return mapper.toResponse(s);
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
}
