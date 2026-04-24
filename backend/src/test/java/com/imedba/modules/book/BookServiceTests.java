package com.imedba.modules.book;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.imedba.common.error.ConflictException;
import com.imedba.modules.author.repository.AuthorRepository;
import com.imedba.modules.book.entity.Book;
import com.imedba.modules.book.mapper.BookMapper;
import com.imedba.modules.book.repository.BookAuthorRepository;
import com.imedba.modules.book.repository.BookRepository;
import com.imedba.modules.book.service.BookService;
import java.math.BigDecimal;
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
class BookServiceTests {

    @Mock private BookRepository bookRepository;
    @Mock private BookAuthorRepository bookAuthorRepository;
    @Mock private AuthorRepository authorRepository;
    @Mock private BookMapper mapper;

    private BookService service;

    @BeforeEach
    void setUp() {
        service = new BookService(bookRepository, bookAuthorRepository, authorRepository, mapper);
        lenient().when(bookRepository.save(any(Book.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(bookAuthorRepository.findByBookId(any(UUID.class))).thenReturn(List.of());
    }

    @Test
    @DisplayName("reserveStock descuenta la cantidad del stock")
    void reserve_stock_decrements() {
        UUID id = UUID.randomUUID();
        Book b = Book.builder().stockQuantity(10).build();
        b.setId(id);
        when(bookRepository.findById(id)).thenReturn(Optional.of(b));

        Book out = service.reserveStock(id, 3);

        assertThat(out.getStockQuantity()).isEqualTo(7);
    }

    @Test
    @DisplayName("reserveStock tira ConflictException si no alcanza el stock")
    void reserve_stock_insufficient_throws_conflict() {
        UUID id = UUID.randomUUID();
        Book b = Book.builder().stockQuantity(2).build();
        b.setId(id);
        when(bookRepository.findById(id)).thenReturn(Optional.of(b));

        assertThatThrownBy(() -> service.reserveStock(id, 5))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Insufficient stock");
        assertThat(b.getStockQuantity()).isEqualTo(2);
    }

    @Test
    @DisplayName("reserveStock rechaza quantity <= 0")
    void reserve_stock_non_positive_rejected() {
        assertThatThrownBy(() -> service.reserveStock(UUID.randomUUID(), 0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("validación de shares: la suma de royaltyPercentage no puede pasar de 100")
    void author_shares_over_100_rejected() {
        // se prueba indirectamente via create con authors; reuso el validador interno
        // a través de crear dos authors que sumen > 100.
        UUID bookId = UUID.randomUUID();
        Book b = Book.builder().salePrice(new BigDecimal("100.00")).stockQuantity(1).build();
        b.setId(bookId);
        when(bookRepository.save(any(Book.class))).thenReturn(b);

        var req = new com.imedba.modules.book.dto.BookCreateRequest(
                "Test", "C1", "spec", "fmt", "1ed", 100,
                new BigDecimal("100.00"), new BigDecimal("30.00"), new BigDecimal("50.00"),
                10, "Central",
                List.of(
                        new com.imedba.modules.book.dto.BookAuthorRequest(
                                UUID.randomUUID(), new BigDecimal("60.00")),
                        new com.imedba.modules.book.dto.BookAuthorRequest(
                                UUID.randomUUID(), new BigDecimal("50.00"))));
        when(mapper.toEntity(req)).thenReturn(b);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("100");
    }
}
