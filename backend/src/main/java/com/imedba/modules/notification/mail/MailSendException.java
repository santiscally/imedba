package com.imedba.modules.notification.mail;

/**
 * Error de envío recuperable o no. El dispatcher lo captura para incrementar
 * attempts y eventualmente marcar la notificación como FAILED.
 */
public class MailSendException extends RuntimeException {

    public MailSendException(String message) {
        super(message);
    }

    public MailSendException(String message, Throwable cause) {
        super(message, cause);
    }
}
