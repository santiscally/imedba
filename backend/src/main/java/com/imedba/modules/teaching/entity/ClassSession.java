package com.imedba.modules.teaching.entity;

import com.imedba.common.entity.BaseEntity;
import com.imedba.modules.staff.entity.Staff;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

/**
 * Una clase dictada. Replica la hoja «HS DOCENTE» de la planilla de IMEDBA (V037).
 *
 * <p>La carga la secretaría; Cobranzas completa {@link #hoursToPay}, que es el
 * chequeo final antes de pedir la factura.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "class_sessions")
@SQLDelete(sql = "UPDATE class_sessions SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class ClassSession extends BaseEntity {

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    /**
     * Texto libre a propósito: mezcla cohortes de PREMA («COM 9», «COM 10») con
     * «comunidad imedba», que es Residencias. Esta liquidación cruza las dos
     * unidades, así que no puede ser una FK a una sola cosa.
     */
    @Column(name = "commission", length = 100)
    private String commission;

    @Column(name = "subject", length = 200)
    private String subject;

    @Column(name = "class_label", length = 300)
    private String classLabel;

    /** Sólo las sincrónicas entran en la liquidación (las asincrónicas no tienen preceptora). */
    @Default
    @Column(name = "is_synchronous", nullable = false)
    private Boolean synchronous = Boolean.TRUE;

    @Column(name = "scheduled_time", length = 50)
    private String scheduledTime;

    @Column(name = "zoom_account", length = 200)
    private String zoomAccount;

    @Column(name = "session_link", length = 500)
    private String sessionLink;

    /** Nullable: en la planilla hay cierres de módulo sin docente asignada. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    private Staff teacher;

    /**
     * <b>Se asigna por clase</b> y no coincide con la docente de esta fila: una
     * misma clase tiene una docente y una preceptora distintas.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "preceptor_id")
    private Staff preceptor;

    /** Duración real. Numérico: en la planilla es texto («2 h 50») y no se puede sumar. */
    @Column(name = "actual_hours", precision = 6, scale = 2)
    private BigDecimal actualHours;

    /** Lo confirma Cobranzas. Si es NULL, la liquidación usa {@link #actualHours}. */
    @Column(name = "hours_to_pay", precision = 6, scale = 2)
    private BigDecimal hoursToPay;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /** Horas que se liquidan: lo confirmado por Cobranzas o, si falta, lo real. */
    public BigDecimal effectiveHours() {
        if (hoursToPay != null) return hoursToPay;
        return actualHours != null ? actualHours : BigDecimal.ZERO;
    }
}
