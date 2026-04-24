package com.imedba.modules.hourlog.service;

import com.imedba.common.auth.AuthUtils;
import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.activitytype.entity.ActivityType;
import com.imedba.modules.activitytype.service.ActivityTypeService;
import com.imedba.modules.hourlog.dto.HourLogCreateRequest;
import com.imedba.modules.hourlog.dto.HourLogResponse;
import com.imedba.modules.hourlog.entity.HourLog;
import com.imedba.modules.hourlog.entity.PaymentStatus;
import com.imedba.modules.hourlog.mapper.HourLogMapper;
import com.imedba.modules.hourlog.repository.HourLogRepository;
import com.imedba.modules.hourlog.repository.HourLogSpecs;
import com.imedba.modules.staff.entity.Staff;
import com.imedba.modules.staff.service.StaffService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registro mensual de horas de staff. Al crear un log, si viene activityTypeId
 * se toma la tarifa del catálogo; si el request trae ratePerHour, ese override
 * pisa la tarifa. En cualquier caso el valor se copia al registro (histórico
 * congelado: cambios posteriores al catálogo no reescriben logs previos).
 *
 * Flujo de factura: PENDING → markInvoiceSent (timestamp email) →
 * markInvoiceReceived (flag + path archivo) → markPaid (paid_at).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class HourLogService {

    private final HourLogRepository repository;
    private final HourLogMapper mapper;
    private final StaffService staffService;
    private final ActivityTypeService activityTypeService;

    public HourLogResponse create(HourLogCreateRequest req) {
        Staff staff = staffService.findEntity(req.staffId());

        String activityName;
        BigDecimal rate;
        if (req.activityTypeId() != null) {
            ActivityType at = activityTypeService.findEntity(req.activityTypeId());
            activityName = at.getName();
            rate = req.ratePerHour() != null ? req.ratePerHour() : at.getRatePerHour();
        } else {
            if (req.activityType() == null || req.activityType().isBlank()) {
                throw new ConflictException(
                        "Se requiere activityTypeId o activityType (nombre)");
            }
            activityName = req.activityType();
            if (req.ratePerHour() == null) {
                throw new ConflictException(
                        "ratePerHour requerido cuando activityTypeId no se provee");
            }
            rate = req.ratePerHour();
        }

        BigDecimal total = req.hours().multiply(rate).setScale(2, RoundingMode.HALF_UP);

        HourLog entry = HourLog.builder()
                .staff(staff)
                .activityType(activityName)
                .periodMonth(req.periodMonth())
                .periodYear(req.periodYear())
                .hours(req.hours())
                .ratePerHour(rate)
                .totalAmount(total)
                .invoiceReceived(Boolean.FALSE)
                .paymentStatus(PaymentStatus.PENDING)
                .notes(req.notes())
                .createdBy(AuthUtils.currentUserId().orElse(null))
                .build();
        return mapper.toResponse(repository.save(entry));
    }

    @Transactional(readOnly = true)
    public HourLogResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    @Transactional(readOnly = true)
    public Page<HourLogResponse> list(UUID staffId, Integer year, Integer month,
                                      PaymentStatus status, String activityType,
                                      Pageable pageable) {
        Specification<HourLog> spec = Specification.where(HourLogSpecs.byStaff(staffId))
                .and(HourLogSpecs.byPeriod(year, month))
                .and(HourLogSpecs.byStatus(status))
                .and(HourLogSpecs.byActivity(activityType));
        return repository.findAll(spec, pageable).map(mapper::toResponse);
    }

    public HourLogResponse markInvoiceSent(UUID id, Instant at) {
        HourLog h = find(id);
        h.setInvoiceEmailSentAt(at != null ? at : Instant.now());
        return mapper.toResponse(h);
    }

    public HourLogResponse markInvoiceReceived(UUID id, String filePath) {
        HourLog h = find(id);
        h.setInvoiceReceived(Boolean.TRUE);
        if (filePath != null && !filePath.isBlank()) {
            h.setInvoiceFilePath(filePath);
        }
        if (h.getPaymentStatus() == PaymentStatus.PENDING) {
            h.setPaymentStatus(PaymentStatus.INVOICE_RECEIVED);
        }
        return mapper.toResponse(h);
    }

    public HourLogResponse markPaid(UUID id, Instant paidAt) {
        HourLog h = find(id);
        if (!Boolean.TRUE.equals(h.getInvoiceReceived())) {
            throw new ConflictException(
                    "No se puede marcar PAID sin factura recibida (invoice_received=false)");
        }
        h.setPaymentStatus(PaymentStatus.PAID);
        h.setPaidAt(paidAt != null ? paidAt : Instant.now());
        return mapper.toResponse(h);
    }

    private HourLog find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("HourLog", id));
    }
}
