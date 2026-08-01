package com.imedba.modules.salescommission.mapper;

import com.imedba.modules.salescommission.dto.SalesCommissionDtos.LineResponse;
import com.imedba.modules.salescommission.dto.SalesCommissionDtos.Response;
import com.imedba.modules.salescommission.dto.SalesCommissionDtos.SummaryResponse;
import com.imedba.modules.salescommission.entity.SalesCommissionLine;
import com.imedba.modules.salescommission.entity.SalesCommissionSettlement;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface SalesCommissionMapper {

    default Response toResponse(SalesCommissionSettlement s) {
        if (s == null) return null;
        return new Response(
                s.getId(), s.getSellerUserId(), s.getSellerName(),
                s.getPeriodMonth(), s.getPeriodYear(),
                s.getTier1Rate(), s.getTier2Rate(), s.getBooksRate(), s.getTierThreshold(),
                s.getTier1Base(), s.getTier1Commission(),
                s.getTier2Base(), s.getTier2Commission(),
                s.getBooksBase(), s.getBooksCommission(),
                s.getPriorMonthsBase(), s.getPriorMonthsCommission(),
                s.getTotalCommission(),
                s.getStatus(), s.getNotes(),
                toLineDtos(s.getLines()),
                s.getCreatedAt(), s.getUpdatedAt());
    }

    default SummaryResponse toSummary(SalesCommissionSettlement s) {
        if (s == null) return null;
        return new SummaryResponse(
                s.getId(), s.getSellerUserId(), s.getSellerName(),
                s.getPeriodMonth(), s.getPeriodYear(),
                s.getTotalCommission(), s.getStatus(), s.getCreatedAt());
    }

    default List<LineResponse> toLineDtos(List<SalesCommissionLine> lines) {
        if (lines == null) return List.of();
        return lines.stream()
                .map(l -> new LineResponse(
                        l.getId(), l.getSourceType(), l.getSourceId(),
                        l.getStudentName(), l.getProductName(),
                        l.getSaleDate(), l.getSaleMonthRank(), l.getRateApplied(),
                        l.getCollectedAmount(), l.getCommissionAmount(),
                        Boolean.TRUE.equals(l.getFromPriorPeriod())))
                .toList();
    }
}
