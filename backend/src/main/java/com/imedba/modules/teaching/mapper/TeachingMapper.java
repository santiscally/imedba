package com.imedba.modules.teaching.mapper;

import com.imedba.modules.teaching.dto.TeachingDtos.ClassSessionResponse;
import com.imedba.modules.teaching.dto.TeachingDtos.LineResponse;
import com.imedba.modules.teaching.dto.TeachingDtos.Response;
import com.imedba.modules.teaching.dto.TeachingDtos.SummaryResponse;
import com.imedba.modules.teaching.entity.ClassSession;
import com.imedba.modules.teaching.entity.TeachingSettlement;
import com.imedba.modules.teaching.entity.TeachingSettlementLine;
import com.imedba.modules.staff.entity.Staff;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface TeachingMapper {

    default ClassSessionResponse toResponse(ClassSession c) {
        if (c == null) return null;
        return new ClassSessionResponse(
                c.getId(), c.getSessionDate(), c.getCommission(),
                c.getSubject(), c.getClassLabel(), c.getSynchronous(),
                c.getScheduledTime(), c.getZoomAccount(), c.getSessionLink(),
                idOf(c.getTeacher()), nameOf(c.getTeacher()),
                idOf(c.getPreceptor()), nameOf(c.getPreceptor()),
                c.getActualHours(), c.getHoursToPay(), c.getNotes(),
                c.getCreatedAt(), c.getUpdatedAt());
    }

    default Response toResponse(TeachingSettlement s) {
        if (s == null) return null;
        return new Response(
                s.getId(),
                s.getStaff() == null ? null : s.getStaff().getId(),
                s.getStaffName(),
                s.getPeriodYear(), s.getPeriodMonth(), s.getRole(),
                s.getHourlyRate(), s.getPerClassBonusHours(),
                s.getClassCount(), s.getTotalHours(), s.getBonusHours(),
                s.getBillableHours(), s.getTotalAmount(),
                s.getInvoiceEmailSentAt(), s.getInvoiceReceived(), s.getPaidAt(),
                s.getStatus(), s.getNotes(),
                toLineDtos(s.getLines()),
                s.getCreatedAt(), s.getUpdatedAt());
    }

    default SummaryResponse toSummary(TeachingSettlement s) {
        if (s == null) return null;
        return new SummaryResponse(
                s.getId(),
                s.getStaff() == null ? null : s.getStaff().getId(),
                s.getStaffName(),
                s.getPeriodYear(), s.getPeriodMonth(), s.getRole(),
                s.getClassCount(), s.getBillableHours(), s.getTotalAmount(),
                s.getStatus());
    }

    default List<LineResponse> toLineDtos(List<TeachingSettlementLine> lines) {
        if (lines == null) return List.of();
        return lines.stream()
                .map(l -> new LineResponse(
                        l.getId(), l.getClassSessionId(), l.getSessionDate(),
                        l.getCommission(), l.getSubject(), l.getClassLabel(),
                        l.getHoursPaid()))
                .toList();
    }

    private static java.util.UUID idOf(Staff s) {
        return s == null ? null : s.getId();
    }

    private static String nameOf(Staff s) {
        return s == null ? null : (s.getLastName() + ", " + s.getFirstName()).trim();
    }
}
