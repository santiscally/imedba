package com.imedba.modules.author.mapper;

import com.imedba.modules.author.dto.AuthorCreateRequest;
import com.imedba.modules.author.dto.AuthorResponse;
import com.imedba.modules.author.dto.AuthorUpdateRequest;
import com.imedba.modules.author.entity.Author;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface AuthorMapper {

    AuthorResponse toResponse(Author a);

    Author toEntity(AuthorCreateRequest req);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(AuthorUpdateRequest req, @MappingTarget Author entity);
}
