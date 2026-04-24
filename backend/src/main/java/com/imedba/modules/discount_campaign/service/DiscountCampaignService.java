package com.imedba.modules.discount_campaign.service;

import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.discount_campaign.dto.DiscountCampaignCreateRequest;
import com.imedba.modules.discount_campaign.dto.DiscountCampaignResponse;
import com.imedba.modules.discount_campaign.dto.DiscountCampaignUpdateRequest;
import com.imedba.modules.discount_campaign.entity.DiscountCampaign;
import com.imedba.modules.discount_campaign.entity.DiscountType;
import com.imedba.modules.discount_campaign.mapper.DiscountCampaignMapper;
import com.imedba.modules.discount_campaign.repository.DiscountCampaignRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class DiscountCampaignService {

    private final DiscountCampaignRepository repository;
    private final DiscountCampaignMapper mapper;

    @Transactional(readOnly = true)
    public Page<DiscountCampaignResponse> list(Pageable pageable) {
        return repository.findAll(pageable).map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<DiscountCampaignResponse> listActive(LocalDate on) {
        LocalDate ref = on != null ? on : LocalDate.now();
        return repository.findActiveOn(ref).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public DiscountCampaignResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    public DiscountCampaignResponse create(DiscountCampaignCreateRequest req) {
        validateDates(req.startDate(), req.endDate());
        validateValue(req.discountType(), req.discountValue());
        DiscountCampaign entity = mapper.fromCreate(req);
        if (req.active() == null) {
            entity.setActive(true);
        }
        return mapper.toResponse(repository.save(entity));
    }

    public DiscountCampaignResponse update(UUID id, DiscountCampaignUpdateRequest req) {
        DiscountCampaign entity = find(id);
        mapper.updateEntity(req, entity);
        validateDates(entity.getStartDate(), entity.getEndDate());
        validateValue(entity.getDiscountType(), entity.getDiscountValue());
        return mapper.toResponse(entity);
    }

    public void deactivate(UUID id) {
        DiscountCampaign entity = find(id);
        entity.setActive(false);
    }

    public void delete(UUID id) {
        DiscountCampaign entity = find(id);
        repository.delete(entity);
    }

    private DiscountCampaign find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("DiscountCampaign", id));
    }

    private static void validateDates(LocalDate start, LocalDate end) {
        if (start == null || end == null) return;
        if (end.isBefore(start)) {
            throw new ConflictException("end_date debe ser >= start_date");
        }
    }

    private static void validateValue(DiscountType type, BigDecimal value) {
        if (type == null || value == null) return;
        if (type == DiscountType.PERCENTAGE && value.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new ConflictException("discount_value con PERCENTAGE no puede superar 100");
        }
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new ConflictException("discount_value debe ser >= 0");
        }
    }
}
