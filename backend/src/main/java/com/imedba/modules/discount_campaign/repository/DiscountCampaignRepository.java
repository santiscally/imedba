package com.imedba.modules.discount_campaign.repository;

import com.imedba.modules.discount_campaign.entity.DiscountCampaign;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DiscountCampaignRepository extends JpaRepository<DiscountCampaign, UUID> {

    @Query("""
           SELECT c FROM DiscountCampaign c
            WHERE c.active = true
              AND c.startDate <= :on
              AND c.endDate   >= :on
            ORDER BY c.startDate DESC
           """)
    List<DiscountCampaign> findActiveOn(@Param("on") LocalDate on);
}
