package com.imedba.modules.notification.template;

/**
 * Payload armado (subject + body HTML) listo para persistir en {@code notifications}.
 * Templates reales son strings inline en {@link NotificationTemplates} — migrarán a
 * templates dinámicos de SendGrid en una iteración futura si hace falta.
 */
public record NotificationTemplate(String subject, String body) {}
