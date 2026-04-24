package com.imedba.modules.notification.template;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Fábrica de templates inline. Estilo sobrio en HTML con sólo los datos clave.
 * Si el producto necesita branding o componentes reusables, migrar a templates
 * dinámicos en SendGrid y mantener acá la referencia por template_id.
 */
public final class NotificationTemplates {

    private static final DateTimeFormatter DATE_ES = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private NotificationTemplates() {}

    public static NotificationTemplate welcome(String studentFirstName, String courseName) {
        String subject = "Bienvenido/a a IMEDBA — " + courseName;
        String body = """
                <p>Hola %s,</p>
                <p>Te damos la bienvenida a <strong>IMEDBA</strong>. Tu inscripción al curso
                <strong>%s</strong> quedó registrada.</p>
                <p>En breve vas a recibir el contrato y el detalle del plan de pagos.</p>
                <p>— Equipo IMEDBA</p>
                """.formatted(escape(studentFirstName), escape(courseName));
        return new NotificationTemplate(subject, body);
    }

    public static NotificationTemplate contract(String studentFirstName, String courseName) {
        String subject = "Contrato IMEDBA — " + courseName;
        String body = """
                <p>Hola %s,</p>
                <p>Adjuntamos el contrato del curso <strong>%s</strong>. Por favor revisalo
                y devolvelo firmado.</p>
                <p>Cualquier duda, respondé este correo.</p>
                """.formatted(escape(studentFirstName), escape(courseName));
        return new NotificationTemplate(subject, body);
    }

    public static NotificationTemplate paymentReceipt(
            String studentFirstName, String receiptNumber, BigDecimal amount, String courseName) {
        String subject = "Recibo de pago " + receiptNumber;
        String body = """
                <p>Hola %s,</p>
                <p>Confirmamos la recepción de tu pago por <strong>$%s</strong>
                correspondiente al curso <strong>%s</strong>.</p>
                <p>Número de recibo: <strong>%s</strong>.</p>
                <p>— Equipo IMEDBA</p>
                """.formatted(escape(studentFirstName), amount.toPlainString(),
                escape(courseName), escape(receiptNumber));
        return new NotificationTemplate(subject, body);
    }

    public static NotificationTemplate preSuspension(
            String studentFirstName, int installmentNumber, LocalDate dueDate) {
        String subject = "Aviso: tu acceso a Moodle se suspende en 2 días";
        String body = """
                <p>Hola %s,</p>
                <p>La cuota <strong>%d</strong> (venció el <strong>%s</strong>) sigue impaga.
                Si no se regulariza en los próximos <strong>2 días</strong>, tu acceso
                al aula virtual (Moodle) será suspendido automáticamente.</p>
                <p>Si ya pagaste, ignorá este mensaje.</p>
                <p>— Equipo IMEDBA</p>
                """.formatted(escape(studentFirstName), installmentNumber, dueDate.format(DATE_ES));
        return new NotificationTemplate(subject, body);
    }

    public static NotificationTemplate suspended(String studentFirstName, String courseName) {
        String subject = "Tu acceso al curso fue suspendido";
        String body = """
                <p>Hola %s,</p>
                <p>Tu acceso al curso <strong>%s</strong> en Moodle fue suspendido por
                cuotas impagas. Para reactivarlo, contactá a administración.</p>
                <p>— Equipo IMEDBA</p>
                """.formatted(escape(studentFirstName), escape(courseName));
        return new NotificationTemplate(subject, body);
    }

    public static NotificationTemplate installmentDueSoon(
            String studentFirstName, int installmentNumber, LocalDate dueDate, BigDecimal amount) {
        String subject = "Recordatorio: cuota " + installmentNumber + " vence el " + dueDate.format(DATE_ES);
        String body = """
                <p>Hola %s,</p>
                <p>Te recordamos que la cuota <strong>%d</strong> por <strong>$%s</strong>
                vence el <strong>%s</strong>.</p>
                <p>— Equipo IMEDBA</p>
                """.formatted(escape(studentFirstName), installmentNumber,
                amount.toPlainString(), dueDate.format(DATE_ES));
        return new NotificationTemplate(subject, body);
    }

    /** Escapado mínimo para evitar inyección básica de HTML en los campos dinámicos. */
    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
