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

    /** Content-ID del logo incrustado inline en el footer de cobranzas (ver SmtpMailSender). */
    public static final String LOGO_CID = "imedba-logo";

    // --- Bloques compartidos de los recordatorios de pago (textos de Nico) ---
    // Se concatenan (NO se pasan por String.formatted): los textos contienen "5%".

    private static final String BANK = """
            <p>Para quienes deban abonar por transferencia bancaria los datos son los siguientes:</p>
            <p><strong>BANCO CREDICOOP</strong><br/>
            CBU: 1910014855001401255578<br/>
            CUIT: 30-71606266-6<br/>
            Cuenta Corriente: 12555-7 Sucursal: 014<br/>
            Imedba PlataformaCIE SRL</p>
            """;

    private static final String BANK_DISCLAIMER = """
            <p>(Cualquier pedido de pago por fuera de estos datos no es válido y debe ser desestimado)</p>
            """;

    private static final String PAYWAY = """
            <p>En caso de que pagues via link (paypal o payway) solicitalo en respuesta a este mail y será enviado.</p>
            """;

    private static final String MERCADOPAGO_NOTE = """
            <p>Les informamos que debido a un hackeo de nuestra cuenta de Mercado Pago, no estará más disponible esa vía de pago.</p>
            """;

    private static final String COBRANZAS_SIGNATURE = """
            <p>--<br/>Departamento de Cobranzas</p>
            <p>Somos un equipo de trabajo dispuesto a acompañarte. ¡Acercate a conocernos!</p>
            <p><img src="cid:imedba-logo" alt="IMEDBA" width="200" height="60" style="display:block;" /></p>
            <p>Whatsapp +54 9 11 2395 3954 - Rojas 61 - CABA<br/>
            Horario de atención: lunes a viernes 10.00 a 17.00 horas<br/>
            (excepto sábados, domingos y feriados)</p>
            """;

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

    /** Recordatorio de pago 3 (Nico): última instancia, 48hs antes de suspender la plataforma. */
    public static NotificationTemplate preSuspension(
            String studentFirstName, int installmentNumber, LocalDate dueDate) {
        String subject = "Imedba - Recordatorio de pago 3";
        String body = """
                <p>Buenas tardes</p>
                <p>Retomamos el contacto habida cuenta que al día de la fecha no hemos recibido el pago
                correspondiente a la cuota del mes. Por tal motivo, en caso de que te encuentres cursando
                actualmente, en las próximas 48hs deberemos proceder a la suspensión de tu ingreso a la
                plataforma. Si actualmente no estás cursando y comienzas en los próximos meses, se realizará
                un recargo mayor pasadas las 24hs de este mail.</p>
                """ + BANK + PAYWAY + COBRANZAS_SIGNATURE;
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

    /** Recordatorio de pago 1 (Nico): aviso general de la ventana de pago (1 al 10), antes del recargo. */
    public static NotificationTemplate installmentDueSoon(
            String studentFirstName, int installmentNumber, LocalDate dueDate, BigDecimal amount) {
        String subject = "Imedba - Recordatorio de pago 1";
        String body = ("""
                <p>Buenas tardes.</p>
                <p>Nos ponemos en contacto para recordarles que el pago de las cuotas debe ser realizado
                del 1 al 10 de cada mes. Pasada esa fecha se aplicará un 5% de recargo sobre el valor
                correspondiente. Si al momento de recibir este correo ya abonaste el pago de la cuota,
                podés desestimar el mensaje.</p>
                <p>El valor es de <strong>${{AMOUNT}}</strong></p>
                """ + BANK + BANK_DISCLAIMER + PAYWAY + MERCADOPAGO_NOTE + COBRANZAS_SIGNATURE)
                .replace("{{AMOUNT}}", amount.toPlainString());
        return new NotificationTemplate(subject, body);
    }

    /** Recordatorio de pago 2 (Nico): cuota vencida con recargo del 5% aplicado. */
    public static NotificationTemplate installmentOverdue(
            String studentFirstName, int installmentNumber, BigDecimal amount) {
        String subject = "Imedba - Recordatorio de pago 2";
        String body = ("""
                <p>Buenas tardes</p>
                <p>Nos ponemos nuevamente en contacto para recordarte que estás adeudando la cuota
                correspondiente al mes en curso. Te recordamos que te corresponde un 5% de recargo sobre
                el valor de la cuota en concepto de pago fuera de término.</p>
                <p>El valor es de <strong>${{AMOUNT}}</strong></p>
                <p>Te solicitamos que nos envíes el comprobante una vez realizado el pago. En caso de que
                ya hayas abonado, por favor envía el comprobante en respuesta a este mail.</p>
                """ + BANK + PAYWAY + COBRANZAS_SIGNATURE)
                .replace("{{AMOUNT}}", amount.toPlainString());
        return new NotificationTemplate(subject, body);
    }

    /**
     * Email a directoras cuando se aprueba una liquidación de diplomatura.
     * Reunión 2026-05-22 §2.6 (Nico 46:56): "el mail que les tiene que llegar
     * de cuánto van a facturar para que nosotros le paguemos".
     */
    public static NotificationTemplate settlementApproved(
            String directorName, String diplomaName,
            int periodMonth, int periodYear,
            BigDecimal amountToInvoice) {
        String subject = "Liquidación " + diplomaName + " — " + periodMonth + "/" + periodYear;
        String body = """
                <p>Hola %s,</p>
                <p>La liquidación de la diplomatura <strong>%s</strong> correspondiente
                al período <strong>%d/%d</strong> fue aprobada.</p>
                <p>Te corresponde facturar: <strong>$%s</strong>.</p>
                <p>Una vez que envíes la factura, IMEDBA va a coordinar el pago.</p>
                <p>— Equipo IMEDBA</p>
                """.formatted(escape(directorName), escape(diplomaName),
                periodMonth, periodYear, amountToInvoice.toPlainString());
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
