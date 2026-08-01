package com.imedba.modules.teaching.service;

import com.imedba.modules.teaching.entity.TeachingRole;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Motor de liquidación de horas docentes y preceptoras. Función pura: no toca DB
 * ni Spring.
 *
 * <p>Fuente: hoja «HS DOCENTE» de {@code liquidaciones-planilla-completa-20260730.xlsx}
 * + respuestas de Nico del 2026-07-30. Ver doc 17 §3.2.
 *
 * <p><b>Fórmulas</b>
 * <pre>
 *   DOCENTE:    total = Σ horas_a_pagar × valor_hora
 *   PRECEPTORA: total = (Σ horas_a_pagar + 0,25 × nro_clases) × valor_hora
 * </pre>
 *
 * <p>El 0,25 son los 15 minutos de anticipación y se suma <b>una vez por clase</b>.
 * <i>No</i> es un recargo del 25% sobre el total: las dos lecturas sólo coinciden si
 * cada clase dura exactamente 1 hora, y con clases de 2 h la diferencia es real
 * (4 clases de 2 h → 9 h contra 10 h). Confirmado explícitamente:
 * <i>«sería la opción A, por cantidad de clases se agrega el 0.25 valor hora»</i>.
 *
 * <p><b>Sólo entran las clases sincrónicas.</b> <i>«Las asincrónicas no tienen
 * preceptora. Podés desestimarlas y que sea solo una liquidación de clases en
 * vivo.»</i> El filtro lo aplica el service al traer las clases; acá se asume que
 * lo que llega ya está filtrado.
 */
public final class TeachingSettlementEngine {

    /** Los 15 minutos de anticipación de la preceptora, en horas. */
    public static final BigDecimal PRECEPTOR_BONUS_PER_CLASS = new BigDecimal("0.25");

    private TeachingSettlementEngine() {}

    /**
     * Una clase que entra en la liquidación, ya resuelta a la persona que se está
     * liquidando (como docente o como preceptora).
     *
     * @param hoursToPay horas a pagar. Es {@code hours_to_pay} si Cobranzas ya lo
     *                   completó; si no, cae a {@code actual_hours}. Resolverlo es
     *                   responsabilidad del service.
     */
    public record SessionInput(
            UUID sessionId,
            LocalDate sessionDate,
            String commission,
            String subject,
            String classLabel,
            BigDecimal hoursToPay) {}

    public record ComputedLine(
            UUID sessionId,
            LocalDate sessionDate,
            String commission,
            String subject,
            String classLabel,
            BigDecimal hoursPaid) {}

    public record Result(
            TeachingRole role,
            BigDecimal hourlyRate,
            BigDecimal perClassBonusHours,
            int classCount,
            BigDecimal totalHours,
            BigDecimal bonusHours,
            BigDecimal billableHours,
            BigDecimal totalAmount,
            List<ComputedLine> lines) {}

    public static Result compute(
            TeachingRole role, BigDecimal hourlyRate, List<SessionInput> sessions) {

        BigDecimal rate = hourlyRate == null ? BigDecimal.ZERO : hourlyRate;
        List<SessionInput> input = sessions == null ? List.of() : sessions;

        List<ComputedLine> lines = new ArrayList<>();
        BigDecimal totalHours = BigDecimal.ZERO;

        for (SessionInput s : input) {
            BigDecimal hours = s.hoursToPay() == null ? BigDecimal.ZERO : s.hoursToPay();
            // Una clase sin horas cargadas igual cuenta como clase: la preceptora
            // estuvo ahí y le corresponde el bonus. Sólo aporta 0 al total de horas.
            totalHours = totalHours.add(hours);
            lines.add(new ComputedLine(
                    s.sessionId(), s.sessionDate(), s.commission(),
                    s.subject(), s.classLabel(), scale2(hours)));
        }

        int classCount = lines.size();

        // El bonus por clase es exclusivo de las preceptoras: es el tiempo de
        // anticipación para abrir la clase, que la docente no hace.
        BigDecimal perClassBonus = role == TeachingRole.PRECEPTORA
                ? PRECEPTOR_BONUS_PER_CLASS : BigDecimal.ZERO;
        BigDecimal bonusHours = perClassBonus.multiply(new BigDecimal(classCount));

        BigDecimal billable = totalHours.add(bonusHours);
        BigDecimal total = billable.multiply(rate).setScale(2, RoundingMode.HALF_UP);

        return new Result(
                role, rate, perClassBonus, classCount,
                scale2(totalHours), scale2(bonusHours), scale2(billable),
                total, List.copyOf(lines));
    }

    private static BigDecimal scale2(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v.setScale(2, RoundingMode.HALF_UP);
    }
}
