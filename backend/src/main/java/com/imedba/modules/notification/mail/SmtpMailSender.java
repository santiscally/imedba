package com.imedba.modules.notification.mail;

import com.imedba.modules.notification.template.NotificationTemplates;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.UnsupportedEncodingException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * Adapter SMTP (Resend u otro relay). Activo sólo si {@code spring.mail.host} tiene valor;
 * en caso contrario {@link NoopMailSenderConfig} provee el bean.
 *
 * <p>Usa el {@link JavaMailSender} autoconfigurado por Spring (host/port/credenciales en
 * {@code spring.mail.*}). Provider-agnostic: para Resend, host {@code smtp.resend.com},
 * usuario {@code resend}, password = API key. STARTTLS 587.
 */
@Slf4j
@Component
@ConditionalOnExpression("T(org.springframework.util.StringUtils).hasText('${spring.mail.host:}')")
public class SmtpMailSender implements MailSender {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String fromName;

    public SmtpMailSender(
            JavaMailSender mailSender,
            @Value("${mail.from.address:no-reply@imedba.local}") String fromAddress,
            @Value("${mail.from.name:IMEDBA}") String fromName) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.fromName = fromName;
    }

    @Override
    public void send(MailRequest request) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(request.to());
            helper.setSubject(request.subject());
            helper.setText(request.body(), true);
            if (request.body() != null && request.body().contains("cid:" + NotificationTemplates.LOGO_CID)) {
                Resource logo = new ClassPathResource("mail/logo-imedba.png");
                if (logo.exists()) {
                    helper.addInline(NotificationTemplates.LOGO_CID, logo, "image/png");
                }
            }
            for (MailAttachment att : request.attachments()) {
                helper.addAttachment(att.filename(), new ByteArrayResource(att.content()), att.contentType());
            }
            mailSender.send(msg);
            log.debug("SMTP: sent to={} attachments={}", request.to(), request.attachments().size());
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new MailSendException("Error armando el mail SMTP para " + request.to(), e);
        } catch (MailException e) {
            throw new MailSendException("SMTP error enviando a " + request.to() + ": " + e.getMessage(), e);
        }
    }
}
