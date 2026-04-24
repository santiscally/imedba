package com.imedba.modules.activitytype.repository;

import com.imedba.modules.activitytype.entity.ActivityType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityTypeRepository extends JpaRepository<ActivityType, UUID> {

    Optional<ActivityType> findByName(String name);

    List<ActivityType> findAllByActiveTrueOrderByName();
}
