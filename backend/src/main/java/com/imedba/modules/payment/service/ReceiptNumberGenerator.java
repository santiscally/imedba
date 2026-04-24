package com.imedba.modules.payment.service;

import com.imedba.modules.payment.repository.PaymentRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Genera receipt_number únicos con formato {@code IMD-YYYYMMDD-XXXXXX}.
 * Reintenta ante colisión (extremadamente improbable con 6 dígitos aleatorios).
 */
@Component
@RequiredArgsConstructor
public class ReceiptNumberGenerator {

    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final int MAX_ATTEMPTS = 5;

    private final PaymentRepository repository;

    public String generate() {
        LocalDate today = LocalDate.now(ZONE);
        String prefix = "IMD-%04d%02d%02d-".formatted(
                today.getYear(), today.getMonthValue(), today.getDayOfMonth());
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String candidate = prefix + "%06d".formatted(
                    ThreadLocalRandom.current().nextInt(1_000_000));
            if (repository.findByReceiptNumber(candidate).isEmpty()) {
                return candidate;
            }
        }
        throw new IllegalStateException(
                "No se pudo generar un receipt_number único tras " + MAX_ATTEMPTS + " intentos");
    }
}
