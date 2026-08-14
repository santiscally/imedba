package com.imedba.modules.diplomasettlement.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Lo que le toca a cada directora. Sin porcentaje: se reparten en partes iguales
 * la mitad del subtotal 2 menos las grabaciones docentes.
 */
public record DirectorDistributionDto(
        UUID staffId,
        String name,
        String email,
        BigDecimal amount,
        Boolean paid
) {}
