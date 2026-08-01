package com.imedba.modules.staff.repository;

import com.imedba.modules.staff.entity.Staff;
import com.imedba.modules.staff.entity.StaffType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface StaffRepository extends JpaRepository<Staff, UUID>, JpaSpecificationExecutor<Staff> {

    /** Para dar un 409 legible en vez del error crudo del unique index (V034). */
    Optional<Staff> findByDni(String dni);

    /** Alimenta el selector de directoras de la diplomatura (V034). */
    List<Staff> findByStaffTypeAndActiveTrueOrderByLastNameAsc(StaffType staffType);
}
