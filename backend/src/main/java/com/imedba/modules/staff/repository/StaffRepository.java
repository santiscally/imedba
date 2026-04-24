package com.imedba.modules.staff.repository;

import com.imedba.modules.staff.entity.Staff;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface StaffRepository extends JpaRepository<Staff, UUID>, JpaSpecificationExecutor<Staff> {
}
