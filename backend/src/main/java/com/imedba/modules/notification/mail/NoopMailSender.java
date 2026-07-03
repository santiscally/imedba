package com.imedba.modules.notification.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Fallback cuando no hay proveedor de mail configurado: loguea el email y lo marca
 * como enviado (no envía). Útil en dev local y tests.
 */
@Slf4j
@Configuration
class NoopMailSenderConfig {

    @Bean
    @ConditionalOnMissingBean(MailSender.class)
    MailSender noopMailSender() {
        log.warn("NoopMailSender activo — sin proveedor de mail configurado; los emails se loguean pero no se envían.");
        return new NoopMailSender();
    }
}

@Slf4j
class NoopMailSender implements MailSender {

    @Override
    public void send(MailRequest request) {
        log.info("[noop-mail] to={} subject={} attachments={}",
                request.to(), request.subject(), request.attachments().size());
    }
}
