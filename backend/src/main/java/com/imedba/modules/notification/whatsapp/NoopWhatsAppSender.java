package com.imedba.modules.notification.whatsapp;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Implementación inerte del canal WhatsApp: loguea el mensaje pero no lo envía.
 * Activa mientras no haya un proveedor real ({@code whatsapp.enabled=false}, default).
 */
@Slf4j
@Configuration
class NoopWhatsAppSenderConfig {

    @Bean
    @ConditionalOnMissingBean(WhatsAppSender.class)
    WhatsAppSender noopWhatsAppSender() {
        log.warn("NoopWhatsAppSender activo — sin proveedor de WhatsApp; los mensajes se loguean pero no se envían.");
        return new WhatsAppSender() {
            @Override
            public void send(String toPhone, String message) {
                log.info("[noop-whatsapp] to={} msg=\"{}\"", toPhone, message);
            }

            @Override
            public boolean isEnabled() {
                return false;
            }
        };
    }
}
