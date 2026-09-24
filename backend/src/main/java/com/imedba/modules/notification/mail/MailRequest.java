package com.imedba.modules.notification.mail;

import java.util.List;

/**
 * Pedido de envío de un mail. {@code body} es siempre HTML. {@code attachments}
 * puede venir vacío (la mayoría de los mails no adjuntan nada; el contrato sí).
 *
 * <p>{@code from} puede ser null: en ese caso el adapter usa su remitente por defecto.
 * Lo setea {@link MailFromResolver} según el tipo de notificación (cobranzas vs informes).
 */
public record MailRequest(
        String to, String subject, String body, List<MailAttachment> attachments, MailFrom from) {

    public MailRequest {
        attachments = attachments == null ? List.of() : List.copyOf(attachments);
    }

    /** Sin remitente explícito: el adapter usa el suyo por defecto. */
    public MailRequest(String to, String subject, String body, List<MailAttachment> attachments) {
        this(to, subject, body, attachments, null);
    }

    /** Mail sin adjuntos (el caso común). */
    public static MailRequest of(String to, String subject, String body) {
        return new MailRequest(to, subject, body, List.of(), null);
    }

    /** Copia con el remitente indicado. */
    public MailRequest withFrom(MailFrom newFrom) {
        return new MailRequest(to, subject, body, attachments, newFrom);
    }

    public boolean hasAttachments() {
        return !attachments.isEmpty();
    }
}
