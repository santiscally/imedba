package com.imedba.modules.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.imedba.modules.notification.entity.NotificationType;
import com.imedba.modules.notification.mail.MailFrom;
import com.imedba.modules.notification.mail.MailFromResolver;
import java.util.EnumSet;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Criterio acordado con IMEDBA: todo lo contable sale de cobranzas (ingresos y egresos);
 * el resto de informes. Estos tests fijan ese mapeo — si mañana se agrega un NotificationType nuevo,
 * {@code todos_los_tipos_tienen_remitente} obliga a decidir de qué casilla sale.
 */
class MailFromResolverTests {

    private static final String INFORMES = "informes@imedba.com.ar";
    private static final String COBRANZAS = "cobranzas@imedba.com.ar";

    private static final Set<NotificationType> ESPERADOS_COBRANZAS = EnumSet.of(
            NotificationType.PAYMENT_RECEIPT,
            NotificationType.INSTALLMENT_DUE_SOON,
            NotificationType.INSTALLMENT_OVERDUE,
            NotificationType.PRE_SUSPENSION,
            NotificationType.SUSPENDED,
            NotificationType.TEACHING_INVOICE_REQUEST);

    private static MailFromResolver resolver() {
        return new MailFromResolver(INFORMES, "IMEDBA", COBRANZAS, "IMEDBA Cobranzas");
    }

    @Test
    @DisplayName("lo contable sale de cobranzas (ingresos y egresos); el resto de informes")
    void mapea_cada_tipo_a_su_casilla() {
        MailFromResolver r = resolver();
        for (NotificationType t : NotificationType.values()) {
            String esperado = ESPERADOS_COBRANZAS.contains(t) ? COBRANZAS : INFORMES;
            assertThat(r.forType(t).address())
                    .as("remitente de %s", t)
                    .isEqualTo(esperado);
        }
    }

    @Test
    @DisplayName("todos los tipos tienen remitente (ningún null, ningún tipo sin decidir)")
    void todos_los_tipos_tienen_remitente() {
        MailFromResolver r = resolver();
        for (NotificationType t : NotificationType.values()) {
            MailFrom from = r.forType(t);
            assertThat(from).as("remitente de %s", t).isNotNull();
            assertThat(from.address()).isNotBlank();
        }
    }

    @Test
    @DisplayName("sin casilla de cobranzas configurada, TODO sale del remitente por defecto")
    void degrada_al_default_si_cobranzas_esta_vacia() {
        MailFromResolver r = new MailFromResolver(INFORMES, "IMEDBA", "", "");
        for (NotificationType t : NotificationType.values()) {
            assertThat(r.forType(t).address()).isEqualTo(INFORMES);
        }
    }

    @Test
    @DisplayName("type null no explota: cae al remitente por defecto")
    void type_null_cae_al_default() {
        assertThat(resolver().forType(null).address()).isEqualTo(INFORMES);
    }

    @Test
    @DisplayName("si no se configura nombre de cobranzas, hereda el nombre por defecto")
    void hereda_el_nombre_por_defecto() {
        MailFromResolver r = new MailFromResolver(INFORMES, "IMEDBA", COBRANZAS, "");
        MailFrom from = r.forType(NotificationType.INSTALLMENT_OVERDUE);
        assertThat(from.address()).isEqualTo(COBRANZAS);
        assertThat(from.name()).isEqualTo("IMEDBA");
    }
}
