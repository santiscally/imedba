package com.imedba.modules.payment.mapper;

import com.imedba.modules.payment.dto.PaymentResponse;
import com.imedba.modules.payment.entity.Payment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PaymentMapper {

    @Mapping(target = "installmentId", source = "installment.id")
    @Mapping(target = "enrollmentId", source = "enrollment.id")
    PaymentResponse toResponse(Payment p);
}
