package com.imedba.modules.collection.repository;

import com.imedba.modules.collection.entity.Collection;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CollectionRepository extends JpaRepository<Collection, UUID> {
}
