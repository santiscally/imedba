package com.imedba.modules.diploma.service;

import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.diploma.dto.DiplomaCreateRequest;
import com.imedba.modules.diploma.dto.DiplomaResponse;
import com.imedba.modules.diploma.dto.DiplomaUpdateRequest;
import com.imedba.modules.diploma.dto.PartnerConfigDto;
import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.diploma.mapper.DiplomaMapper;
import com.imedba.modules.diploma.repository.DiplomaRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class DiplomaService {

    private final DiplomaRepository repository;
    private final DiplomaMapper mapper;

    @Transactional(readOnly = true)
    public List<DiplomaResponse> list(Boolean onlyActive) {
        List<Diploma> items = Boolean.TRUE.equals(onlyActive)
                ? repository.findAllByActiveTrueOrderByName()
                : repository.findAll();
        return items.stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public DiplomaResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    public DiplomaResponse create(DiplomaCreateRequest req) {
        validatePartners(req.partnersConfig());
        Diploma d = Diploma.builder()
                .name(req.name())
                .universityName(req.universityName())
                .description(req.description())
                .enrollmentPrice(req.enrollmentPrice())
                .coursePrice(req.coursePrice())
                .taxCommissionPct(req.taxCommissionPct())
                .secretarySalary(req.secretarySalary())
                .advertisingAmount(req.advertisingAmount())
                .adminPct(req.adminPct())
                .universityPct(req.universityPct())
                .imedbaPct(req.imedbaPct())
                .partnersConfig(new ArrayList<>(mapper.fromDtoList(req.partnersConfig())))
                .active(Boolean.TRUE)
                .build();
        return mapper.toResponse(repository.save(d));
    }

    public DiplomaResponse update(UUID id, DiplomaUpdateRequest req) {
        Diploma d = find(id);
        if (req.name() != null) d.setName(req.name());
        if (req.universityName() != null) d.setUniversityName(req.universityName());
        if (req.description() != null) d.setDescription(req.description());
        if (req.enrollmentPrice() != null) d.setEnrollmentPrice(req.enrollmentPrice());
        if (req.coursePrice() != null) d.setCoursePrice(req.coursePrice());
        if (req.taxCommissionPct() != null) d.setTaxCommissionPct(req.taxCommissionPct());
        if (req.secretarySalary() != null) d.setSecretarySalary(req.secretarySalary());
        if (req.advertisingAmount() != null) d.setAdvertisingAmount(req.advertisingAmount());
        if (req.adminPct() != null) d.setAdminPct(req.adminPct());
        if (req.universityPct() != null) d.setUniversityPct(req.universityPct());
        if (req.imedbaPct() != null) d.setImedbaPct(req.imedbaPct());
        if (req.partnersConfig() != null) {
            validatePartners(req.partnersConfig());
            d.setPartnersConfig(new ArrayList<>(mapper.fromDtoList(req.partnersConfig())));
        }
        if (req.active() != null) d.setActive(req.active());
        return mapper.toResponse(d);
    }

    public void deactivate(UUID id) {
        Diploma d = find(id);
        d.setActive(Boolean.FALSE);
    }

    public Diploma findEntity(UUID id) {
        return find(id);
    }

    private void validatePartners(List<PartnerConfigDto> partners) {
        if (partners == null || partners.isEmpty()) return;
        BigDecimal sum = partners.stream()
                .map(p -> p.pct() == null ? BigDecimal.ZERO : p.pct())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (sum.compareTo(new BigDecimal("100.00")) > 0) {
            throw new ConflictException(
                    "La suma de los % de socias no puede exceder 100 (actual: " + sum + ")");
        }
    }

    private Diploma find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Diploma", id));
    }
}
