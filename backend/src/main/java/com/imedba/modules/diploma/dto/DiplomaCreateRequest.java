package com.imedba.modules.diploma.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * La diplomatura ES un curso (decisión 2026-06-09): al crearla, el backend genera
 * automáticamente su curso espejo en FORMACION_SUPERIOR (nombre/precios sincronizados).
 * Los alumnos se inscriben a ese curso con el flujo normal — no hay vínculo manual.
 *
 * <p>Desde V035 <b>no se piden costos ni porcentajes acá</b>: todo eso se carga al
 * liquidar. Lo único que se define es <b>quiénes son las directoras</b> — el «% de la
 * directora» que se pedía antes lo bajó el cliente el 2026-07-23.
 */
public record DiplomaCreateRequest(
        @NotBlank @Size(max = 300) String name,
        @Size(max = 200) String universityName,
        String description,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal enrollmentPrice,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal coursePrice,
        /** Ids de Personal Académico (staff) con rol DIRECTORA. Reparten en partes iguales. */
        List<UUID> directorIds
) {}
