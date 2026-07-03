package com.imedba.modules.notification.mail;

import java.util.List;

/**
 * Pedido de envío de un mail. {@code body} es siempre HTML. {@code attachments}
 * puede venir vacío (la mayoría de los mails no adjuntan nada; el contrato sí).
 */
public record MailRequest(String to, String subject, String body, List<MailAttachment> attachments) {

    public MailRequest {
        attachments = attachments == null ? List.of() : List.copyOf(attachments);
    }

    /** Mail sin adjuntos (el caso común). */
    public static MailRequest of(String to, String subject, String body) {
        return new MailRequest(to, subject, body, List.of());
    }

    public boolean hasAttachments() {
        return !attachments.isEmpty();
    }
}
