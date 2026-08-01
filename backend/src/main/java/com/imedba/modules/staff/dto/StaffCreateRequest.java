package com.imedba.modules.staff.dto;

import com.imedba.modules.staff.entity.StaffSegment;
import com.imedba.modules.staff.entity.StaffType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record StaffCreateRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @Email @Size(max = 255) String email,
        @Size(max = 50) String phone,
        @NotNull StaffType staffType,

        // Personal Académico (V034)
        @Size(max = 20) String dni,
        @Size(max = 200) String subject,
        StaffSegment segment,
        /** null = true (se liquida por horas). false = sueldo fijo, fuera de la liquidación. */
        Boolean paidByHours,
        /** Además de su rol hace seguimiento. No es un rol aparte (V036). */
        Boolean tutor,
        /** Override del valor hora. null = usar el del tipo de actividad. */
        @DecimalMin("0.00") BigDecimal hourlyRate,

        String notes
) {}
