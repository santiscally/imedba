package com.imedba.modules.diploma.entity;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;

/**
 * Socia docente en el reparto de un diploma.
 * pct suma con el resto de socias debería dar <= 100.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PartnerConfig(
        String name,
        BigDecimal pct,
        String email
) {}
