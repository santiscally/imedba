package com.imedba.modules.book.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record BookAuthorResponse(
        UUID authorId,
        String firstName,
        String lastName,
        BigDecimal royaltyPercentage
) {}
