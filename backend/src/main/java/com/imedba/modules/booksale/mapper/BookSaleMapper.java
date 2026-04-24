package com.imedba.modules.booksale.mapper;

import com.imedba.modules.booksale.dto.BookSaleResponse;
import com.imedba.modules.booksale.entity.BookSale;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BookSaleMapper {

    @Mapping(target = "bookId", source = "book.id")
    @Mapping(target = "bookName", source = "book.name")
    @Mapping(target = "studentId", source = "student.id")
    @Mapping(target = "enrollmentId", source = "enrollment.id")
    BookSaleResponse toResponse(BookSale sale);
}
