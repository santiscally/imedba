package com.imedba.modules.diplomasettlement.mapper;

import com.imedba.modules.diplomasettlement.dto.DiplomaSettlementResponse;
import com.imedba.modules.diplomasettlement.dto.PartnerDistributionDto;
import com.imedba.modules.diplomasettlement.entity.DiplomaSettlement;
import com.imedba.modules.diplomasettlement.entity.PartnerDistribution;
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
                s.getPeriodMonth(), s.getPeriodYear(), s.getTotalCollected(),
                s.getTaxCommissionAmount(), s.getSecretaryAmount(), s.getAdvertisingAmount(),
                s.getAdminAmount(), s.getUniversityAmount(), s.getImedbaAmount(),
                s.getPartnersTotal(),
                toDtoList(s.getPartnersDistribution()),
                s.getStatus(), s.getCreatedAt(), s.getUpdatedAt());
    }

    default List<PartnerDistributionDto> toDtoList(List<PartnerDistribution> list) {
        if (list == null) return List.of();
        return list.stream()
                .map(p -> new PartnerDistributionDto(
                        p.name(), p.pct(), p.amount(), p.email(), p.paid()))
                .toList();
    }
}
