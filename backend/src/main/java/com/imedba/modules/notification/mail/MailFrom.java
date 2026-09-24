package com.imedba.modules.notification.mail;

/**
 * Remitente de un mail (dirección + nombre visible).
 *
 * <p>IMEDBA usa dos casillas según de qué hable el mail: la de cobranzas para todo lo que
 * sea plata que el alumno debe (cuotas, matrícula, recargos, suspensión por mora) y la de
 * informes para el resto (contrato, bienvenida, avisos internos). El mapeo vive en
 * {@link MailFromResolver}.
 */
public record MailFrom(String address, String name) {

    public MailFrom {
        if (address == null || address.isBlank()) {
            throw new IllegalArgumentException("la dirección del remitente no puede estar vacía");
        }
    }
}
