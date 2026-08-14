package com.imedba.modules.staff.dto;

import com.imedba.modules.staff.entity.StaffSegment;
import com.imedba.modules.staff.entity.StaffType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record StaffUpdateRequest(
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        @Email @Size(max = 255) String email,
        @Size(max = 50) String phone,
        StaffType staffType,

        // Personal Académico (V034)
        @Size(max = 20) String dni,
        @Size(max = 200) String subject,
        StaffSegment segment,
        Boolean paidByHours,
        Boolean tutor,
        @DecimalMin("0.00") BigDecimal hourlyRate,

        Boolean active,
        String notes
) {}
