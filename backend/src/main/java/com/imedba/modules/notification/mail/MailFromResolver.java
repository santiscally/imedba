package com.imedba.modules.notification.mail;

import com.imedba.modules.notification.entity.NotificationType;
import java.util.EnumSet;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Decide desde qué casilla sale cada notificación.
 *
 * <p>Criterio (definido con IMEDBA): <b>todo lo que es deuda, matrícula y cuotas sale de
 * cobranzas; el resto de informes.</b> Que el aviso de cuota vencida llegue desde
 * {@code cobranzas@} y no desde una casilla genérica importa para que el alumno sepa a
 * quién responder, y para que las respuestas caigan en la bandeja correcta.
 *
 * <p>Degradación segura: si no se configura la casilla de cobranzas, TODO sale del
 * remitente por defecto ({@code mail.from.address}), que es exactamente el comportamiento
 * anterior a este cambio. Nunca falla por configuración incompleta.
 *
 * <p>Ojo: el dominio del remitente tiene que estar verificado en el proveedor (Resend).
 * Configurar acá una casilla de un dominio sin verificar hace que el proveedor rechace
 * el envío, no que llegue mal.
 */
@Component
public class MailFromResolver {

    /**
     * Tipos que hablan de plata que el alumno debe. {@code PAYMENT_RECEIPT} entra acá
     * porque es el comprobante de una cuota pagada: si el alumno responde preguntando por
     * un pago, tiene que contestar cobranzas. {@code PRE_SUSPENSION} y {@code SUSPENDED}
     * también, porque la causa es la mora.
     */
    private static final Set<NotificationType> COBRANZAS = EnumSet.of(
            NotificationType.PAYMENT_RECEIPT,
            NotificationType.INSTALLMENT_DUE_SOON,
            NotificationType.INSTALLMENT_OVERDUE,
            NotificationType.PRE_SUSPENSION,
            NotificationType.SUSPENDED);

    private final MailFrom defaultFrom;
    private final MailFrom cobranzasFrom;

    public MailFromResolver(
            @Value("${mail.from.address:no-reply@imedba.local}") String defaultAddress,
            @Value("${mail.from.name:IMEDBA}") String defaultName,
            @Value("${mail.from.cobranzas.address:}") String cobranzasAddress,
            @Value("${mail.from.cobranzas.name:}") String cobranzasName) {
        this.defaultFrom = new MailFrom(defaultAddress, defaultName);
        this.cobranzasFrom = (cobranzasAddress == null || cobranzasAddress.isBlank())
                ? null
                : new MailFrom(
                        cobranzasAddress,
                        (cobranzasName == null || cobranzasName.isBlank()) ? defaultName : cobranzasName);
    }

    /** Remitente que corresponde al tipo. Nunca devuelve null. */
    public MailFrom forType(NotificationType type) {
        if (type != null && cobranzasFrom != null && COBRANZAS.contains(type)) {
            return cobranzasFrom;
        }
        return defaultFrom;
    }

    /** Remitente por defecto (informes). Para mails que no nacen de una notificación. */
    public MailFrom defaultFrom() {
        return defaultFrom;
    }
}
