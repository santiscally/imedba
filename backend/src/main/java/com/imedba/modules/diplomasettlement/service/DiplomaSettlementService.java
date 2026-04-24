package com.imedba.modules.diplomasettlement.service;

import com.imedba.common.auth.AuthUtils;
import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.diploma.service.DiplomaService;
import com.imedba.modules.diplomasettlement.dto.DiplomaSettlementCreateRequest;
import com.imedba.modules.diplomasettlement.dto.DiplomaSettlementResponse;
import com.imedba.modules.diplomasettlement.entity.DiplomaSettlement;
import com.imedba.modules.diplomasettlement.entity.SettlementStatus;
import com.imedba.modules.diplomasettlement.mapper.DiplomaSettlementMapper;
import com.imedba.modules.diplomasettlement.repository.DiplomaSettlementRepository;
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

    public DiplomaSettlementResponse createDraft(DiplomaSettlementCreateRequest req) {
        repository.findByDiplomaIdAndPeriodYearAndPeriodMonth(
                        req.diplomaId(), req.periodYear(), req.periodMonth())
                .ifPresent(s -> {
                    throw new ConflictException("Ya existe una liquidación para " +
                            req.periodYear() + "-" + req.periodMonth() +
                            " (id=" + s.getId() + ", status=" + s.getStatus() + ")");
                });

        Diploma d = diplomaService.findEntity(req.diplomaId());
        DiplomaSettlement settlement = SettlementEngine.compute(
                d, req.periodYear(), req.periodMonth(), req.totalCollected());
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
        DiplomaSettlement recomputed = SettlementEngine.compute(
                existing.getDiploma(),
                existing.getPeriodYear(),
                existing.getPeriodMonth(),
                existing.getTotalCollected());
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
        return mapper.toResponse(s);
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
