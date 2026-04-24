package com.imedba.modules.diplomasettlement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.imedba.common.error.ConflictException;
import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.diploma.service.DiplomaService;
import com.imedba.modules.diplomasettlement.dto.DiplomaSettlementCreateRequest;
import com.imedba.modules.diplomasettlement.dto.DiplomaSettlementResponse;
import com.imedba.modules.diplomasettlement.entity.DiplomaSettlement;
import com.imedba.modules.diplomasettlement.entity.SettlementStatus;
import com.imedba.modules.diplomasettlement.mapper.DiplomaSettlementMapper;
import com.imedba.modules.diplomasettlement.repository.DiplomaSettlementRepository;
import com.imedba.modules.diplomasettlement.service.DiplomaSettlementService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DiplomaSettlementServiceTests {

    @Mock private DiplomaSettlementRepository repository;
    @Mock private DiplomaSettlementMapper mapper;
    @Mock private DiplomaService diplomaService;

    private DiplomaSettlementService service;

    @BeforeEach
    void setUp() {
        service = new DiplomaSettlementService(repository, mapper, diplomaService);
        lenient().when(repository.save(any(DiplomaSettlement.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        lenient().when(mapper.toResponse(any(DiplomaSettlement.class)))
                .thenAnswer(inv -> stubResponse(inv.getArgument(0)));
    }

    @Test
    @DisplayName("createDraft rechaza si ya existe liquidación para el mismo período")
    void create_draft_rejects_duplicate_period() {
        UUID diplomaId = UUID.randomUUID();
        DiplomaSettlement existing = DiplomaSettlement.builder()
                .periodYear(2026).periodMonth(4)
                .status(SettlementStatus.APPROVED).build();
        existing.setId(UUID.randomUUID());
        when(repository.findByDiplomaIdAndPeriodYearAndPeriodMonth(diplomaId, 2026, 4))
                .thenReturn(Optional.of(existing));

        var req = new DiplomaSettlementCreateRequest(
                diplomaId, 4, 2026, new BigDecimal("1000.00"));

        assertThatThrownBy(() -> service.createDraft(req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Ya existe una liquidación");
    }

    @Test
    @DisplayName("createDraft crea con status=DRAFT y aplica motor de liquidación")
    void create_draft_applies_engine_and_sets_status_draft() {
        UUID diplomaId = UUID.randomUUID();
        Diploma d = Diploma.builder()
                .name("Dip").taxCommissionPct(new BigDecimal("10.00"))
                .secretarySalary(BigDecimal.ZERO).advertisingAmount(BigDecimal.ZERO)
                .adminPct(BigDecimal.ZERO).universityPct(BigDecimal.ZERO)
                .imedbaPct(BigDecimal.ZERO).partnersConfig(List.of())
                .build();
        d.setId(diplomaId);
        when(repository.findByDiplomaIdAndPeriodYearAndPeriodMonth(any(UUID.class), anyInt(), anyInt()))
                .thenReturn(Optional.empty());
        when(diplomaService.findEntity(diplomaId)).thenReturn(d);

        var req = new DiplomaSettlementCreateRequest(
                diplomaId, 4, 2026, new BigDecimal("1000.00"));

        DiplomaSettlementResponse out = service.createDraft(req);

        assertThat(out.status()).isEqualTo(SettlementStatus.DRAFT);
        assertThat(out.taxCommissionAmount()).isEqualByComparingTo("100.00");
    }

    @Test
    @DisplayName("recomputeDraft sólo funciona en DRAFT")
    void recompute_only_in_draft() {
        UUID id = UUID.randomUUID();
        DiplomaSettlement approved = settlementFixture(id, SettlementStatus.APPROVED);
        when(repository.findById(id)).thenReturn(Optional.of(approved));

        assertThatThrownBy(() -> service.recomputeDraft(id))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("DRAFT");
    }

    @Test
    @DisplayName("approve DRAFT → APPROVED")
    void approve_draft_to_approved() {
        UUID id = UUID.randomUUID();
        DiplomaSettlement s = settlementFixture(id, SettlementStatus.DRAFT);
        when(repository.findById(id)).thenReturn(Optional.of(s));

        DiplomaSettlementResponse out = service.approve(id);

        assertThat(s.getStatus()).isEqualTo(SettlementStatus.APPROVED);
        assertThat(out.status()).isEqualTo(SettlementStatus.APPROVED);
    }

    @Test
    @DisplayName("approve rechaza si no está en DRAFT")
    void approve_rejects_non_draft() {
        UUID id = UUID.randomUUID();
        DiplomaSettlement paid = settlementFixture(id, SettlementStatus.PAID);
        when(repository.findById(id)).thenReturn(Optional.of(paid));

        assertThatThrownBy(() -> service.approve(id))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("markPaid APPROVED → PAID")
    void mark_paid_approved_to_paid() {
        UUID id = UUID.randomUUID();
        DiplomaSettlement s = settlementFixture(id, SettlementStatus.APPROVED);
        when(repository.findById(id)).thenReturn(Optional.of(s));

        service.markPaid(id);

        assertThat(s.getStatus()).isEqualTo(SettlementStatus.PAID);
    }

    @Test
    @DisplayName("markPaid rechaza si status=DRAFT (no aprobada aún)")
    void mark_paid_rejects_draft() {
        UUID id = UUID.randomUUID();
        DiplomaSettlement draft = settlementFixture(id, SettlementStatus.DRAFT);
        when(repository.findById(id)).thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> service.markPaid(id))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("APPROVED");
    }

    private static DiplomaSettlement settlementFixture(UUID id, SettlementStatus status) {
        Diploma d = Diploma.builder()
                .name("Dip").taxCommissionPct(BigDecimal.ZERO)
                .secretarySalary(BigDecimal.ZERO).advertisingAmount(BigDecimal.ZERO)
                .adminPct(BigDecimal.ZERO).universityPct(BigDecimal.ZERO)
                .imedbaPct(BigDecimal.ZERO).partnersConfig(List.of())
                .build();
        d.setId(UUID.randomUUID());
        DiplomaSettlement s = DiplomaSettlement.builder()
                .diploma(d)
                .periodMonth(4).periodYear(2026)
                .totalCollected(new BigDecimal("1000.00"))
                .status(status)
                .build();
        s.setId(id);
        return s;
    }

    private static DiplomaSettlementResponse stubResponse(DiplomaSettlement s) {
        return new DiplomaSettlementResponse(
                s.getId(),
                s.getDiploma() == null ? null : s.getDiploma().getId(),
                s.getDiploma() == null ? null : s.getDiploma().getName(),
                s.getPeriodMonth(), s.getPeriodYear(), s.getTotalCollected(),
                s.getTaxCommissionAmount(), s.getSecretaryAmount(), s.getAdvertisingAmount(),
                s.getAdminAmount(), s.getUniversityAmount(), s.getImedbaAmount(),
                s.getPartnersTotal(),
                List.of(),
                s.getStatus(), s.getCreatedAt(), s.getUpdatedAt());
    }
}
