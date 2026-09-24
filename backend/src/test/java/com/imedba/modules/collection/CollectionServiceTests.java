package com.imedba.modules.collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.imedba.modules.book.entity.Book;
import com.imedba.modules.book.repository.BookRepository;
import com.imedba.modules.booksale.entity.BookSale;
import com.imedba.modules.booksale.mapper.BookSaleMapper;
import com.imedba.modules.booksale.service.BookSaleService;
import com.imedba.modules.collection.dto.CollectionCreateRequest;
import com.imedba.modules.collection.dto.CollectionResponse;
import com.imedba.modules.collection.dto.CollectionSellRequest;
import com.imedba.modules.collection.entity.Collection;
import com.imedba.modules.collection.entity.CollectionVariant;
import com.imedba.modules.collection.repository.CollectionRepository;
import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.enrollment.repository.EnrollmentRepository;
import com.imedba.modules.student.repository.StudentRepository;
import com.imedba.modules.collection.service.CollectionService;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CollectionServiceTests {

    @Mock private CollectionRepository repository;
    @Mock private BookRepository bookRepository;
    @Mock private BookSaleService bookSaleService;
    @Mock private BookSaleMapper bookSaleMapper;
    @Mock private StudentRepository studentRepository;
    @Mock private EnrollmentRepository enrollmentRepository;

    private CollectionService service;

    @BeforeEach
    void setUp() {
        service = new CollectionService(repository, bookRepository, bookSaleService,
                bookSaleMapper, studentRepository, enrollmentRepository);
        lenient().when(repository.save(any(Collection.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("el precio de la colección es la suma del precio de lista de sus libros")
    void price_is_sum_of_book_prices() {
        Collection c = collection(book("100000"), book("250000.50"), book("49999.50"));
        when(repository.findById(c.getId())).thenReturn(Optional.of(c));

        CollectionResponse out = service.get(c.getId());

        assertThat(out.price()).isEqualByComparingTo("400000.00");
    }

    @Test
    @DisplayName("una colección sin libros vale 0")
    void empty_collection_is_zero() {
        Collection c = collection();
        when(repository.findById(c.getId())).thenReturn(Optional.of(c));

        assertThat(service.get(c.getId()).price()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("editar la colección persiste la unidad de negocio")
    void update_persists_business_unit() {
        Collection c = collection();
        c.setBusinessUnit(BusinessUnit.RESIDENCIAS);
        when(repository.findById(c.getId())).thenReturn(Optional.of(c));

        service.update(c.getId(), new CollectionCreateRequest(
                "Colección FS", BusinessUnit.FORMACION_SUPERIOR, CollectionVariant.TRADICIONAL,
                null, null, List.of()));

        assertThat(c.getBusinessUnit()).isEqualTo(BusinessUnit.FORMACION_SUPERIOR);
    }

    @Test
    @DisplayName("vender reparte la suma de los libros con el descuento alumno, proporcional a cada libro")
    void sell_uses_sum_of_books_with_discount() {
        Book a = book("300000");
        Book b = book("100000");
        Collection c = collection(a, b);
        c.setStudentDiscountPct(new BigDecimal("35.00"));
        when(repository.findById(c.getId())).thenReturn(Optional.of(c));
        when(bookSaleService.createForCollection(any(), any(), anyBoolean(), isNull(), isNull(), any()))
                .thenReturn(new BookSale());

        service.sell(c.getId(), new CollectionSellRequest(null, null, true));

        verify(bookSaleService).createForCollection(eq(a.getId()),
                eq(new BigDecimal("195000.00")), eq(true), isNull(), isNull(), any());
        verify(bookSaleService).createForCollection(eq(b.getId()),
                eq(new BigDecimal("65000.00")), eq(true), isNull(), isNull(), any());
    }

    private static Collection collection(Book... books) {
        Collection c = Collection.builder()
                .name("Colección Residencias")
                .variant(CollectionVariant.TRADICIONAL)
                .books(new ArrayList<>(List.of(books)))
                .build();
        c.setId(UUID.randomUUID());
        return c;
    }

    private static Book book(String salePrice) {
        Book b = Book.builder().name("Libro").salePrice(new BigDecimal(salePrice)).build();
        b.setId(UUID.randomUUID());
        return b;
    }
}
