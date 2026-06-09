package com.imedba.modules.notification.whatsapp;

/**
 * Canal de WhatsApp (NUEVO, reunión 2026-06-05: "avisar al suspender por mail + WhatsApp").
 *
 * <p>Hoy sólo existe la implementación inerte {@link NoopWhatsAppSender}. Cuando se
 * elija un proveedor (Twilio / Meta Cloud API / 360dialog), agregar un adapter real
 * condicionado por {@code whatsapp.enabled=true} — mismo patrón que el MailSender de
 * SendGrid. No requiere cambios en el resto de la app: se inyecta esta interfaz.</p>
 */
public interface WhatsAppSender {

    /**
     * Envía un mensaje de WhatsApp. {@code toPhone} en formato E.164 (ej. {@code +5493415551234}).
     * No lanza checked exceptions: el canal es best-effort (un fallo no debe cortar el flujo
     * de suspensión). Una implementación real debería loguear/registrar fallos internamente.
     */
    void send(String toPhone, String message);

    /** true si hay un proveedor real configurado y activo. */
    boolean isEnabled();
}
