package com.imedba.modules.notification.mail;

import jakarta.activation.DataHandler;
import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import jakarta.mail.util.ByteArrayDataSource;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.util.Properties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.EmailContent;
import software.amazon.awssdk.services.sesv2.model.RawMessage;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;
import software.amazon.awssdk.services.sesv2.model.SesV2Exception;

/**
 * Adapter AWS SES v2. Activo sólo si {@code aws.ses.from-email} no está vacío;
 * en caso contrario {@link NoopMailSenderConfig} provee el bean.
 *
 * <p>Manda el mail como mensaje MIME crudo (SES {@code SendEmail} con raw content)
 * para poder adjuntar el PDF del contrato. Las credenciales se resuelven por la
 * default chain del SDK (env vars / instance profile).
 */
@Slf4j
@Component
@ConditionalOnExpression("T(org.springframework.util.StringUtils).hasText('${aws.ses.from-email:}')")
public class SesMailSender implements MailSender {

    private final SesV2Client client;
    private final String fromEmail;
    private final String fromName;
    private final Session session = Session.getInstance(new Properties());

    public SesMailSender(
            @Value("${aws.ses.region:us-east-1}") String region,
            @Value("${aws.ses.from-email}") String fromEmail,
            @Value("${aws.ses.from-name:IMEDBA}") String fromName) {
        this.client = SesV2Client.builder().region(Region.of(region)).build();
        this.fromEmail = fromEmail;
        this.fromName = fromName;
    }

    @Override
    public void send(MailRequest request) {
        byte[] mime;
        try {
            mime = buildMime(request);
        } catch (MessagingException | IOException e) {
            throw new MailSendException("Error armando el MIME para " + request.to(), e);
        }
        try {
            client.sendEmail(SendEmailRequest.builder()
                    .content(EmailContent.builder()
                            .raw(RawMessage.builder().data(SdkBytes.fromByteArray(mime)).build())
                            .build())
                    .build());
            log.debug("SES: sent to={} attachments={}", request.to(), request.attachments().size());
        } catch (SesV2Exception e) {
            String detail = e.awsErrorDetails() != null ? e.awsErrorDetails().errorMessage() : e.getMessage();
            throw new MailSendException("SES error enviando a " + request.to() + ": " + detail, e);
        }
    }

    private byte[] buildMime(MailRequest request) throws MessagingException, IOException {
        MimeMessage msg = new MimeMessage(session);
        try {
            msg.setFrom(new InternetAddress(fromEmail, fromName, "UTF-8"));
        } catch (UnsupportedEncodingException e) {
            msg.setFrom(new InternetAddress(fromEmail));
        }
        msg.setRecipients(MimeMessage.RecipientType.TO, request.to());
        msg.setSubject(request.subject(), "UTF-8");

        if (request.hasAttachments()) {
            MimeBodyPart htmlPart = new MimeBodyPart();
            htmlPart.setContent(request.body(), "text/html; charset=UTF-8");
            MimeMultipart multipart = new MimeMultipart("mixed");
            multipart.addBodyPart(htmlPart);
            for (MailAttachment att : request.attachments()) {
                MimeBodyPart part = new MimeBodyPart();
                part.setDataHandler(new DataHandler(new ByteArrayDataSource(att.content(), att.contentType())));
                part.setFileName(att.filename());
                multipart.addBodyPart(part);
            }
            msg.setContent(multipart);
        } else {
            msg.setContent(request.body(), "text/html; charset=UTF-8");
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        msg.writeTo(out);
        return out.toByteArray();
    }
}
