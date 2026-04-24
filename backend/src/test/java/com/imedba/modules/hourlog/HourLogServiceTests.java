package com.imedba.modules.hourlog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.imedba.common.error.ConflictException;
import com.imedba.modules.activitytype.entity.ActivityType;
import com.imedba.modules.activitytype.service.ActivityTypeService;
import com.imedba.modules.hourlog.dto.HourLogCreateRequest;
import com.imedba.modules.hourlog.dto.HourLogResponse;
import com.imedba.modules.hourlog.entity.HourLog;
import com.imedba.modules.hourlog.entity.PaymentStatus;
import com.imedba.modules.hourlog.mapper.HourLogMapper;
import com.imedba.modules.hourlog.repository.HourLogRepository;
import com.imedba.modules.hourlog.service.HourLogService;
import com.imedba.modules.staff.entity.Staff;
import com.imedba.modules.staff.entity.StaffType;
import com.imedba.modules.staff.service.StaffService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HourLogServiceTests {

    @Mock private HourLogRepository repository;
    @Mock private HourLogMapper mapper;
    @Mock private StaffService staffService;
    @Mock private ActivityTypeService activityTypeService;

    private HourLogService service;

    @BeforeEach
    void setUp() {
        service = new HourLogService(repository, mapper, staffService, activityTypeService);
        lenient().when(repository.save(any(HourLog.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(mapper.toResponse(any(HourLog.class))).thenAnswer(inv -> {
            HourLog h = inv.getArgument(0);
            return new HourLogResponse(
                    h.getId(),
                    h.getStaff() == null ? null : h.getStaff().getId(),
                    null,
                    h.getActivityType(),
                    h.getPeriodMonth(), h.getPeriodYear(),
                    h.getHours(), h.getRatePerHour(), h.getTotalAmount(),
                    h.getInvoiceEmailSentAt(), h.getInvoiceReceived(), h.getInvoiceFilePath(),
                    h.getPaymentStatus(), h.getPaidAt(), h.getNotes(),
                    h.getCreatedAt());
        });
    }

    @Test
    @DisplayName("create con activityTypeId copia tarifa del catálogo y calcula total = hours × rate")
    void create_with_activity_type_id_copies_rate_and_calculates_total() {
        UUID staffId = UUID.randomUUID();
        UUID atId = UUID.randomUUID();
        Staff staff = staffFixture(staffId);
        ActivityType at = ActivityType.builder()
                .name("Clase teórica")
                .ratePerHour(new BigDecimal("1500.00"))
                .build();
        at.setId(atId);
        when(staffService.findEntity(staffId)).thenReturn(staff);
        when(activityTypeService.findEntity(atId)).thenReturn(at);

        var req = new HourLogCreateRequest(
                staffId, atId, null, 4, 2026,
                new BigDecimal("10.00"), null, "notas");

        HourLogResponse out = service.create(req);

        assertThat(out.ratePerHour()).isEqualByComparingTo("1500.00");
        assertThat(out.totalAmount()).isEqualByComparingTo("15000.00");
        assertThat(out.activityType()).isEqualTo("Clase teórica");
        assertThat(out.paymentStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    @DisplayName("create con ratePerHour override pisa la tarifa del catálogo")
    void create_with_rate_override_uses_override() {
        UUID staffId = UUID.randomUUID();
        UUID atId = UUID.randomUUID();
        when(staffService.findEntity(staffId)).thenReturn(staffFixture(staffId));
        ActivityType at = ActivityType.builder()
                .name("Tutoría").ratePerHour(new BigDecimal("1000.00")).build();
        at.setId(atId);
        when(activityTypeService.findEntity(atId)).thenReturn(at);

        var req = new HourLogCreateRequest(
                staffId, atId, null, 4, 2026,
                new BigDecimal("5.00"), new BigDecimal("2000.00"), null);

        HourLogResponse out = service.create(req);

        assertThat(out.ratePerHour()).isEqualByComparingTo("2000.00");
        assertThat(out.totalAmount()).isEqualByComparingTo("10000.00");
    }

    @Test
    @DisplayName("create con activityType libre requiere ratePerHour")
    void create_with_free_text_requires_rate() {
        UUID staffId = UUID.randomUUID();
        when(staffService.findEntity(staffId)).thenReturn(staffFixture(staffId));

        var req = new HourLogCreateRequest(
                staffId, null, "Evento puntual", 4, 2026,
                new BigDecimal("2.00"), null, null);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("ratePerHour");
    }

    @Test
    @DisplayName("create sin activityTypeId ni activityType lanza ConflictException")
    void create_without_activity_throws() {
        UUID staffId = UUID.randomUUID();
        when(staffService.findEntity(staffId)).thenReturn(staffFixture(staffId));

        var req = new HourLogCreateRequest(
                staffId, null, null, 4, 2026,
                new BigDecimal("2.00"), new BigDecimal("500.00"), null);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("activityTypeId o activityType");
    }

    @Test
    @DisplayName("markInvoiceReceived transiciona PENDING → INVOICE_RECEIVED y guarda filePath")
    void mark_invoice_received_transitions_pending_to_invoice_received() {
        UUID id = UUID.randomUUID();
        HourLog h = hourLogFixture(id, PaymentStatus.PENDING, Boolean.FALSE);
        when(repository.findById(id)).thenReturn(Optional.of(h));

        service.markInvoiceReceived(id, "/docs/factura.pdf");

        assertThat(h.getInvoiceReceived()).isTrue();
        assertThat(h.getInvoiceFilePath()).isEqualTo("/docs/factura.pdf");
        assertThat(h.getPaymentStatus()).isEqualTo(PaymentStatus.INVOICE_RECEIVED);
    }

    @Test
    @DisplayName("markPaid sin factura recibida lanza ConflictException")
    void mark_paid_without_invoice_throws_conflict() {
        UUID id = UUID.randomUUID();
        HourLog h = hourLogFixture(id, PaymentStatus.PENDING, Boolean.FALSE);
        when(repository.findById(id)).thenReturn(Optional.of(h));

        assertThatThrownBy(() -> service.markPaid(id, Instant.now()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("factura recibida");
        assertThat(h.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    @DisplayName("markPaid con invoice_received=true setea status=PAID y paidAt")
    void mark_paid_after_invoice_received_succeeds() {
        UUID id = UUID.randomUUID();
        HourLog h = hourLogFixture(id, PaymentStatus.INVOICE_RECEIVED, Boolean.TRUE);
        when(repository.findById(id)).thenReturn(Optional.of(h));
        Instant when = Instant.parse("2026-05-10T12:00:00Z");

        service.markPaid(id, when);

        assertThat(h.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(h.getPaidAt()).isEqualTo(when);
    }

    private static Staff staffFixture(UUID id) {
        Staff s = Staff.builder()
                .firstName("Ana").lastName("Gómez")
                .staffType(StaffType.DOCENTE).active(Boolean.TRUE)
                .build();
        s.setId(id);
        return s;
    }

    private static HourLog hourLogFixture(UUID id, PaymentStatus status, Boolean invoiceReceived) {
        HourLog h = HourLog.builder()
                .staff(staffFixture(UUID.randomUUID()))
                .activityType("Clase")
                .periodMonth(4).periodYear(2026)
                .hours(new BigDecimal("8.00"))
                .ratePerHour(new BigDecimal("1000.00"))
                .totalAmount(new BigDecimal("8000.00"))
                .paymentStatus(status)
                .invoiceReceived(invoiceReceived)
                .build();
        h.setId(id);
        return h;
    }
}
