package com.imedba.config;

import com.sendgrid.SendGrid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cliente SendGrid. Si la API key está vacía se crea un cliente "dummy" que va a fallar
 * si se intenta enviar — así el backend sigue arrancando en dev sin credenciales reales.
 * El envío concreto vivirá en el módulo {@code notification}.
 */
@Configuration
public class SendGridConfig {

    @Value("${sendgrid.api-key:}")
    private String apiKey;

    @Bean
    public SendGrid sendGrid() {
        return new SendGrid(apiKey == null || apiKey.isBlank() ? "DUMMY_KEY_REPLACE_ME" : apiKey);
    }
}
