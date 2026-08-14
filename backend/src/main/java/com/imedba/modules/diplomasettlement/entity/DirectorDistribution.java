package com.imedba.modules.diplomasettlement.entity;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Snapshot de lo que le toca a una directora al momento de liquidar.
 *
 * <p>Se conserva aunque después cambien las directoras de la diplomatura o sus
 * datos en Personal Académico: lo emitido no se reescribe.
 *
 * <p>No hay porcentaje por cabeza: la mitad de las directoras (ya descontadas las
 * grabaciones) se divide en <b>partes iguales</b>. El residuo de la división lo
 * absorbe la última, para que la identidad de control cierre al centavo.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DirectorDistribution(
        UUID staffId,
        String name,
        String firstName,
        String email,
        BigDecimal amount,
        Boolean paid
) {

    /**
     * Nombre de pila para el saludo del mail. Cobranzas escribe «Hola Iris,», no
     * «Hola Alvarez, Iris» — y {@link #name} está en formato apellido-primero
     * porque es lo que se muestra en la grilla. En snapshots viejos (sin este
     * campo en el JSONB) cae al nombre completo antes que saludar vacío.
     */
    public String greetingName() {
        if (firstName != null && !firstName.isBlank()) return firstName;
        return name != null ? name : "";
    }
}
