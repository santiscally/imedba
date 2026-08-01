package com.imedba.modules.diplomasettlement.mapper;

import com.imedba.modules.diplomasettlement.dto.DiplomaSettlementResponse;
import com.imedba.modules.diplomasettlement.dto.DirectorDistributionDto;
import com.imedba.modules.diplomasettlement.entity.DiplomaSettlement;
import com.imedba.modules.diplomasettlement.entity.DirectorDistribution;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DiplomaSettlementMapper {

    default DiplomaSettlementResponse toResponse(DiplomaSettlement s) {
        if (s == null) return null;
        return new DiplomaSettlementResponse(
                s.getId(),
                s.getDiploma() == null ? null : s.getDiploma().getId(),
                s.getDiploma() == null ? null : s.getDiploma().getName(),
                s.getPeriodMonth(), s.getPeriodYear(),
                // inputs
                s.getInputTaxCommissionPct(),
                s.getInputSecretarySalary(),
                s.getInputAdvertisingAmount(),
                s.getInputAdministrationAmount(),
                s.getInputMiscExpensesAmount(),
                s.getInputRecordingsAmount(),
                s.getInputImedbaPct(),
                s.getInputUntrefPct(),
                // cálculo, paso por paso
                s.getTotalCollected(),
                s.getTaxCommissionAmount(),
                s.getSubtotal1(),
                s.getSecretaryAmount(),
                s.getAdvertisingAmount(),
                s.getAdministrationAmount(),
                s.getMiscExpensesAmount(),
                s.getSubtotal2(),
                s.getHalfAmount(),
                s.getRecordingsAmount(),
                s.getDirectorsBaseAmount(),
                toDtoList(s.getDirectorsDistribution()),
                s.getImedbaAmount(),
                s.getUntrefAmount(),
                s.getStatus(), s.getCreatedAt(), s.getUpdatedAt());
    }

    default List<DirectorDistributionDto> toDtoList(List<DirectorDistribution> list) {
        if (list == null) return List.of();
        return list.stream()
                .map(d -> new DirectorDistributionDto(
                        d.staffId(), d.name(), d.email(), d.amount(), d.paid()))
                .toList();
    }
}
