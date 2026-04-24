package com.imedba.modules.discount_campaign.mapper;

import com.imedba.modules.discount_campaign.dto.DiscountCampaignCreateRequest;
import com.imedba.modules.discount_campaign.dto.DiscountCampaignResponse;
import com.imedba.modules.discount_campaign.dto.DiscountCampaignUpdateRequest;
import com.imedba.modules.discount_campaign.entity.DiscountCampaign;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface DiscountCampaignMapper {

    DiscountCampaignResponse toResponse(DiscountCampaign c);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    DiscountCampaign fromCreate(DiscountCampaignCreateRequest req);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(DiscountCampaignUpdateRequest req, @MappingTarget DiscountCampaign entity);
}
