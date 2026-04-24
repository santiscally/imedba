package com.imedba.modules.diploma.mapper;

import com.imedba.modules.diploma.dto.DiplomaResponse;
import com.imedba.modules.diploma.dto.PartnerConfigDto;
import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.diploma.entity.PartnerConfig;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DiplomaMapper {

    default DiplomaResponse toResponse(Diploma d) {
        if (d == null) return null;
        return new DiplomaResponse(
                d.getId(), d.getName(), d.getUniversityName(), d.getDescription(),
                d.getEnrollmentPrice(), d.getCoursePrice(),
                d.getTaxCommissionPct(), d.getSecretarySalary(), d.getAdvertisingAmount(),
                d.getAdminPct(), d.getUniversityPct(), d.getImedbaPct(),
                toDtoList(d.getPartnersConfig()),
                d.getActive(), d.getCreatedAt(), d.getUpdatedAt());
    }

    default List<PartnerConfigDto> toDtoList(List<PartnerConfig> list) {
        if (list == null) return List.of();
        return list.stream()
                .map(p -> new PartnerConfigDto(p.name(), p.pct(), p.email()))
                .toList();
    }

    default List<PartnerConfig> fromDtoList(List<PartnerConfigDto> list) {
        if (list == null) return List.of();
        return list.stream()
                .map(p -> new PartnerConfig(p.name(), p.pct(), p.email()))
                .toList();
    }
}
