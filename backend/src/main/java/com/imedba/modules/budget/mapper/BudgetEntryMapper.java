package com.imedba.modules.budget.mapper;

import com.imedba.modules.budget.dto.BudgetEntryResponse;
import com.imedba.modules.budget.entity.BudgetEntry;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BudgetEntryMapper {

    @Mapping(target = "contactId", source = "contact.id")
    @Mapping(target = "enrollmentId", source = "enrollment.id")
    @Mapping(target = "paymentId", source = "payment.id")
    @Mapping(target = "bookSaleId", source = "bookSale.id")
    BudgetEntryResponse toResponse(BudgetEntry e);
}
