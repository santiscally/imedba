package com.imedba.modules.notification.contract;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Genera el PDF del contrato de matrícula a partir de {@link ContractData}.
 * El texto de las 13 cláusulas es el oficial de Jaque (DOCX en
 * {@code instrucciones_claude/contratos/contrato-template-final.docx}); el DOCX
 * sigue siendo la fuente de verdad para editar — si cambia, se re-traduce el HTML.
 *
 * <p>Render HTML→PDF con openhtmltopdf (PDFBox). El input debe ser XHTML bien formado.
 */
@Component
public class ContractPdfRenderer {

    private static final DateTimeFormatter DATE_ES = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] render(ContractData d) {
        String html = DOC_OPEN + header(d) + CLAUSES + DOC_CLOSE;
        try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, null);
            builder.toStream(os);
            builder.run();
            return os.toByteArray();
        } catch (IOException e) {
            throw new ContractPdfException("Error generando el PDF del contrato", e);
        }
    }

    /** Encabezado con los datos variables del alumno/curso. Sin literales '%'. */
    private static String header(ContractData d) {
        return """
                <h1>IMPRESO DE MATRÍCULA</h1>
                <p class="addr">Rojas 61 - CABA (Capital Federal) - Teléfono: 11 2462-2203 - E-mail: info@imed-ba.com</p>

                <h2>Datos del alumno</h2>
                <table class="data">
                  <tr><td class="label">Nombre</td><td>%s</td><td class="label">Apellido</td><td>%s</td></tr>
                  <tr><td class="label">Nacionalidad</td><td>%s</td><td class="label">D.N.I.</td><td>%s</td></tr>
                  <tr><td class="label">Fecha de nacimiento</td><td>%s</td><td class="label">E-mail</td><td>%s</td></tr>
                </table>

                <h2>Datos económicos</h2>
                <table class="data">
                  <tr><td class="label">Valor curso</td><td>%s</td><td class="label">Importe total</td><td>%s</td></tr>
                  <tr><td class="label">Descuento</td><td>%s</td><td></td><td></td></tr>
                </table>

                <h2>Grupos ofertados</h2>
                <table class="data">
                  <tr><td class="label">Nombre del grupo</td><td>%s</td></tr>
                  <tr><td class="label">Inicio</td><td>%s</td><td class="label">Fin</td><td>%s</td></tr>
                </table>
                """.formatted(
                esc(d.firstName()), esc(d.lastName()),
                esc(d.nationality()), esc(d.dni()),
                date(d.birthDate()), esc(d.email()),
                money(d.courseValue()), money(d.totalAmount()),
                esc(d.discountLabel()),
                esc(d.groupName()),
                date(d.groupStart()), date(d.groupEnd()));
    }

    private static final String DOC_OPEN = """
            <html xmlns="http://www.w3.org/1999/xhtml"><head>
            <meta charset="UTF-8" />
            <style>
              @page { size: A4; margin: 2cm; }
              body { font-family: 'Helvetica', sans-serif; font-size: 10pt; color: #000; line-height: 1.4; }
              h1 { font-size: 15pt; text-align: center; margin: 0; }
              p.addr { text-align: center; font-size: 8pt; margin: 2px 0 14px; }
              h2 { font-size: 11pt; border-bottom: 1px solid #000; margin: 14px 0 6px; }
              table.data { width: 100%; border-collapse: collapse; font-size: 9pt; }
              table.data td { padding: 2px 4px; vertical-align: top; }
              td.label { font-weight: bold; width: 18%; }
              h3.agreement { font-size: 11pt; text-align: center; margin: 18px 0 6px; }
              p.clause { text-align: justify; margin: 6px 0; }
              p.sign { margin-top: 40px; }
            </style>
            </head><body>
            """;

    /**
     * Texto fijo de las 13 cláusulas (idéntico al DOCX). NO se pasa por
     * {@code String.formatted}: contiene literales "(5%)" / "(10%)" que romperían
     * el parser de format specifiers.
     */
    private static final String CLAUSES = """
            <h3 class="agreement">Acuerdo entre partes</h3>

            <p class="clause"><strong>PRIMERA - Obligaciones de la Institución:</strong> La Institución se compromete a impartir la totalidad de las clases correspondientes al programa del curso seleccionado por EL ALUMNO/A, a proporcionar el material didáctico pertinente y a brindar el asesoramiento docente necesario, todo ello de conformidad con el programa académico e instructivos vigentes.</p>

            <p class="clause"><strong>SEGUNDA - Condiciones de Pago y Mora:</strong> EL ALUMNO/A se obliga a abonar la totalidad del costo del curso elegido. En caso de optar por un plan de financiación, las cuotas deberán abonarse dentro del período de vencimiento que le sea informado por la Institución al momento de la contratación.</p>
            <p class="clause">Se aplicará un recargo del cinco por ciento (5%) sobre el valor de la cuota a partir del día siguiente al vencimiento correspondiente.</p>
            <p class="clause">Aquellos ALUMNOS/AS que no hayan regularizado el pago de sus cuotas dentro de los diez (10) días corridos posteriores al vencimiento serán suspendidos del acceso a la plataforma virtual y a las clases en línea. Pasados treinta (30) días corridos desde el vencimiento impago, la matrícula de EL ALUMNO/A podrá ser dada de baja automáticamente, sin que ello genere derecho a reclamo alguno por los pagos previamente efectuados.</p>

            <p class="clause"><strong>TERCERA - Medios y Comunicación de Pagos:</strong> La comunicación de pagos deberá realizarse a cobranzas@imedba.com. Los pagos podrán efectuarse mediante los medios de pago habilitados por la Institución. La modalidad de pago acordada al inicio deberá mantenerse, salvo aprobación administrativa expresa para su modificación.</p>

            <p class="clause"><strong>CUARTA - Compromiso de Pago y No Reintegro por Abandono:</strong> EL ALUMNO/A se compromete a completar la totalidad de los pagos correspondientes al curso elegido, independientemente de su permanencia o asistencia al mismo, salvo en los casos expresamente contemplados en la Cláusula Séptima del presente contrato. En caso de que EL ALUMNO/A decida no iniciar o abandonar el curso una vez contratado, la Institución quedará eximida de realizar reintegro alguno, ya sea de forma parcial o total, de los montos abonados.</p>

            <p class="clause"><strong>QUINTA - Inicio y Posposición de la Cursada:</strong> EL ALUMNO/A se compromete a iniciar el curso en la fecha indicada al momento de la contratación. En caso de que desee posponer la fecha de inicio, deberá notificarlo por correo electrónico a info@imed-ba.com. La aceptación de dicha solicitud quedará sujeta a disponibilidad, aprobación de la Institución y, en su caso, al abono de la diferencia económica que corresponda conforme a las condiciones vigentes al momento de la modificación.</p>

            <p class="clause"><strong>SEXTA - Vigencia del Curso y Acceso a la Plataforma:</strong> EL ALUMNO/A reconoce que el curso contratado posee una fecha de inicio y una fecha de finalización expresamente indicadas en el presente contrato. El acceso a la plataforma educativa, clases grabadas, materiales de estudio y demás recursos asociados al curso se mantendrá únicamente hasta la fecha de finalización establecida, independientemente de la modalidad de pago elegida o de la cantidad de cuotas pendientes de vencimiento.</p>
            <p class="clause">La finalización del curso producirá automáticamente la baja de los accesos correspondientes, sin necesidad de notificación previa. La continuidad de acceso a ciclos lectivos posteriores requerirá una nueva inscripción o el cumplimiento de las condiciones de pase previstas en la Cláusula Séptima, salvo disposición expresa en contrario por parte de la Institución.</p>

            <p class="clause"><strong>SÉPTIMA - Condiciones de Modalidad, Precios, Beneficios y Pases:</strong> El cambio entre distintas modalidades de curso podrá solicitarse en cualquier momento durante la vigencia del ciclo lectivo contratado. En caso de que la modalidad elegida tenga un valor superior al de la originalmente contratada, EL ALUMNO/A deberá abonar la diferencia correspondiente conforme a los valores vigentes al momento de solicitar el cambio. En ningún caso procederán reintegros, devoluciones o compensaciones económicas por cambios hacia modalidades de menor valor.</p>
            <p class="clause">El valor del curso contratado y los accesos asociados al mismo se mantendrán exclusivamente durante el ciclo lectivo correspondiente y hasta la fecha de finalización indicada en el presente contrato. Transcurrido dicho plazo, regirán las condiciones previstas en la presente cláusula para el pase al ciclo lectivo siguiente.</p>
            <p class="clause">EL ALUMNO/A podrá solicitar el pase al ciclo lectivo inmediato siguiente sin abonar el valor del nuevo ciclo lectivo cuando haya utilizado menos del diez por ciento (10%) de los contenidos y recursos del curso, conforme surja de los registros de uso de la plataforma educativa de IMEDBA, o cuando no haya rendido ningún examen de ingreso a residencias médicas durante el período correspondiente al curso contratado por motivos de salud o administrativos debidamente acreditados mediante documentación fehaciente y aprobada por IMEDBA.</p>
            <p class="clause">Para acceder a dicho beneficio, EL ALUMNO/A deberá no registrar deuda alguna con IMEDBA al momento de solicitar el pase y, en caso de haber accedido a descuentos, promociones, becas o cualquier otro beneficio económico al momento de la inscripción, abonar previamente el importe equivalente al beneficio recibido.</p>
            <p class="clause">Aquellos alumnos que no reúnan las condiciones precedentemente establecidas podrán acceder al ciclo lectivo inmediato siguiente con bonificación del valor de matrícula, debiendo abonar el precio vigente correspondiente al curso elegido al momento de su reinscripción.</p>
            <p class="clause">Los descuentos, promociones y becas son personales, intransferibles y se aplican exclusivamente a la contratación inicial, salvo disposición expresa en contrario por parte de IMEDBA.</p>

            <p class="clause"><strong>OCTAVA - Intransferibilidad de Cursos:</strong> Los cursos contratados son personales e intransferibles y no podrán ser cedidos, transferidos o compartidos con terceros bajo ninguna circunstancia.</p>

            <p class="clause"><strong>NOVENA - Propiedad Intelectual:</strong> EL ALUMNO/A reconoce que todos los contenidos, materiales didácticos, grabaciones de clases, programas de estudio, textos, imágenes, libros y cualquier otro material puesto a disposición por la Institución en el marco del presente curso, en cualquier formato, son propiedad exclusiva de la Institución y están protegidos por la Ley N.º 11.723 de Propiedad Intelectual.</p>
            <p class="clause">Queda estrictamente prohibida su reproducción, distribución, comunicación pública, modificación, comercialización o cualquier otra forma de explotación total o parcial sin la autorización expresa y por escrito de la Institución.</p>
            <p class="clause">Asimismo, queda prohibido compartir con terceros usuarios, contraseñas o cualquier otra credencial de acceso a las plataformas y servicios provistos por la Institución.</p>
            <p class="clause">El incumplimiento de esta cláusula facultará a la Institución a suspender o cancelar inmediatamente el acceso de EL ALUMNO/A a las plataformas y servicios contratados, sin derecho a reintegro alguno, sin perjuicio de las acciones civiles o penales que pudieran corresponder.</p>

            <p class="clause"><strong>DÉCIMA - Modificaciones Académicas y Operativas:</strong> La Institución podrá realizar modificaciones razonables en los cronogramas, horarios, docentes, contenidos complementarios, plataformas tecnológicas o modalidades de dictado cuando razones académicas, operativas, organizativas o de fuerza mayor así lo requieran, garantizando en todos los casos el cumplimiento de los objetivos formativos del curso contratado.</p>

            <p class="clause"><strong>DÉCIMA PRIMERA - Protección de Datos Personales:</strong> EL ALUMNO/A presta su consentimiento para que la Institución recopile, almacene y procese sus datos personales con fines académicos, administrativos, comerciales y de comunicación institucional, de conformidad con la Ley N.º 25.326 de Protección de los Datos Personales y demás normativa aplicable.</p>

            <p class="clause"><strong>DÉCIMA SEGUNDA - Horario de Atención y Contacto:</strong> El horario de atención al público de la Institución es de lunes a jueves de 10:00 a 18:00 horas. Las comunicaciones podrán realizarse mediante correo electrónico a info@imed-ba.com o por WhatsApp al número +54 11 2462-2203.</p>

            <p class="clause"><strong>DÉCIMA TERCERA - Jurisdicción:</strong> Para cualquier controversia derivada de la interpretación, cumplimiento o ejecución del presente contrato, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires, con renuncia expresa a cualquier otro fuero o jurisdicción que pudiera corresponder.</p>
            """;

    private static final String DOC_CLOSE = """
            <p class="sign">Firma y fecha: _________________________________</p>
            </body></html>
            """;

    private static String date(LocalDate d) {
        return d == null ? "A confirmar" : d.format(DATE_ES);
    }

    private static String money(BigDecimal v) {
        if (v == null) return "—";
        DecimalFormatSymbols sym = new DecimalFormatSymbols(Locale.ROOT);
        sym.setGroupingSeparator('.');
        sym.setDecimalSeparator(',');
        return new DecimalFormat("$#,##0.00", sym).format(v);
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
