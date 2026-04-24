package com.imedba.modules.diplomasettlement.entity;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;

/**
 * Snapshot de cómo se reparte un monto a una socia al momento de liquidar.
 * Se conserva aunque el config del diploma cambie después (historia inmutable).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PartnerDistribution(
        String name,
        BigDecimal pct,
        BigDecimal amount,
        String email,
        Boolean paid
) {}
