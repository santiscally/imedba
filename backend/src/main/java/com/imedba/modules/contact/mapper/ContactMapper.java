package com.imedba.modules.contact.mapper;

import com.imedba.modules.contact.dto.ContactCreateRequest;
import com.imedba.modules.contact.dto.ContactResponse;
import com.imedba.modules.contact.dto.ContactUpdateRequest;
import com.imedba.modules.contact.entity.Contact;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface ContactMapper {

    ContactResponse toResponse(Contact c);

    Contact toEntity(ContactCreateRequest req);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(ContactUpdateRequest req, @MappingTarget Contact entity);
}
