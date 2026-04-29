package com.imedba.modules.notification.mail;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

/**
 * Adapter SendGrid v3. Activo sólo si {@code sendgrid.api-key} no está vacío;
 * en caso contrario {@link NoopMailSenderConfig} provee el bean.
 */
@Slf4j
@Component
@ConditionalOnExpression("T(org.springframework.util.StringUtils).hasText('${sendgrid.api-key:}')")
public class SendGridMailSender implements MailSender {

    private final SendGrid client;
    private final String fromEmail;
    private final String fromName;

    public SendGridMailSender(
            @Value("${sendgrid.api-key}") String apiKey,
            @Value("${sendgrid.from-email:no-reply@imedba.dev}") String fromEmail,
            @Value("${sendgrid.from-name:IMEDBA}") String fromName) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("sendgrid.api-key vacío pero SendGridMailSender activo");
        }
        this.client = new SendGrid(apiKey);
        this.fromEmail = fromEmail;
        this.fromName = fromName;
    }

    @Override
    public void send(String to, String subject, String body) {
        Mail mail = new Mail(
                new Email(fromEmail, fromName),
                subject,
                new Email(to),
                new Content("text/html", body));
        Request req = new Request();
        try {
            req.setMethod(Method.POST);
            req.setEndpoint("mail/send");
            req.setBody(mail.build());
            Response res = client.api(req);
            int status = res.getStatusCode();
            if (status >= 400) {
                throw new MailSendException("SendGrid HTTP " + status + ": " + res.getBody());
            }
            log.debug("SendGrid: sent to={} status={}", to, status);
        } catch (IOException e) {
            throw new MailSendException("SendGrid I/O error enviando a " + to, e);
        }
    }
}
