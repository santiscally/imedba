package com.imedba.modules.notification.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

/**
 * Fallback cuando no hay {@code SENDGRID_API_KEY} configurada: loggea el email
 * y lo marca como enviado. Útil en dev local y tests.
 */
@Slf4j
@Configuration
class NoopMailSenderConfig {

    @Bean
    @ConditionalOnMissingBean(MailSender.class)
    MailSender noopMailSender() {
        log.warn("NoopMailSender activo — SENDGRID_API_KEY no configurado; los emails se loguean pero no se envían.");
        return (to, subject, body) -> log.info("[noop-mail] to={} subject={}", to, subject);
    }
}
