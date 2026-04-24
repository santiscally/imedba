package com.imedba.modules.diploma.repository;

import com.imedba.modules.diploma.entity.Diploma;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiplomaRepository extends JpaRepository<Diploma, UUID> {

    List<Diploma> findAllByActiveTrueOrderByName();
}
