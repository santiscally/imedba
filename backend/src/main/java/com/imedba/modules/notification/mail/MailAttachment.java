package com.imedba.modules.notification.mail;

import java.util.Objects;

/**
 * Adjunto de un mail. {@code content} son los bytes crudos del archivo; cada
 * adapter los codifica como corresponda (base64 para APIs HTTP, parte MIME para SES).
 */
public record MailAttachment(String filename, String contentType, byte[] content) {

    public MailAttachment {
        Objects.requireNonNull(filename, "filename");
        Objects.requireNonNull(content, "content");
        if (contentType == null || contentType.isBlank()) {
            contentType = "application/octet-stream";
        }
    }

    public static MailAttachment pdf(String filename, byte[] content) {
        return new MailAttachment(filename, "application/pdf", content);
    }
}
