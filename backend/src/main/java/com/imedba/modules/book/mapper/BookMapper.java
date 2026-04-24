package com.imedba.modules.book.mapper;

import com.imedba.modules.book.dto.BookAuthorResponse;
import com.imedba.modules.book.dto.BookCreateRequest;
import com.imedba.modules.book.dto.BookResponse;
import com.imedba.modules.book.dto.BookUpdateRequest;
import com.imedba.modules.book.entity.Book;
import com.imedba.modules.book.entity.BookAuthor;
import java.util.List;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface BookMapper {

    @Mapping(target = "authors", ignore = true)
    BookResponse toResponse(Book b);

    default BookResponse toResponseWithAuthors(Book b, List<BookAuthor> links) {
        if (b == null) return null;
        List<BookAuthorResponse> authors = links == null ? List.of()
                : links.stream().map(this::toAuthorLink).toList();
        return new BookResponse(
                b.getId(),
                b.getName(),
                b.getCode(),
                b.getSpecialty(),
                b.getFormat(),
                b.getEdition(),
                b.getPages(),
                b.getSalePrice(),
                b.getStudentDiscountPct(),
                b.getCostPerUnit(),
                b.getStockQuantity(),
                b.getBranch(),
                b.getActive(),
                authors,
                b.getCreatedAt(),
                b.getUpdatedAt()
        );
    }

    @Mapping(target = "authorId", source = "author.id")
    @Mapping(target = "firstName", source = "author.firstName")
    @Mapping(target = "lastName", source = "author.lastName")
    BookAuthorResponse toAuthorLink(BookAuthor ba);

    Book toEntity(BookCreateRequest req);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(BookUpdateRequest req, @MappingTarget Book entity);
}
