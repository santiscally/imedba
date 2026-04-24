package com.imedba.modules.notification.mail;

/**
 * Abstracción de envío de mails. Una sola implementación activa por context
 * (SendGrid en prod/dev con API key; NoopMailSender si no hay API key).
 */
public interface MailSender {

    /**
     * Envía el email. Si el proveedor remoto responde con error, lanzar
     * {@link MailSendException} — el scheduler de dispatch hace retry/FAILED.
     */
    void send(String to, String subject, String body) throws MailSendException;
}
