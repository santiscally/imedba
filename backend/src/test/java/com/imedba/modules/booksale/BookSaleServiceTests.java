package com.imedba.modules.booksale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.imedba.modules.author.entity.Author;
import com.imedba.modules.book.entity.Book;
import com.imedba.modules.book.entity.BookAuthor;
import com.imedba.modules.book.repository.BookAuthorRepository;
import com.imedba.modules.book.service.BookService;
import com.imedba.modules.booksale.dto.BookSaleCreateRequest;
import com.imedba.modules.booksale.dto.BookSaleResponse;
import com.imedba.modules.booksale.dto.RoyaltyLineResponse;
import com.imedba.modules.booksale.entity.BookSale;
import com.imedba.modules.booksale.mapper.BookSaleMapper;
import com.imedba.modules.booksale.repository.BookSaleRepository;
import com.imedba.modules.booksale.service.BookSaleService;
import com.imedba.modules.budget.service.BudgetService;
import com.imedba.modules.enrollment.repository.EnrollmentRepository;
import com.imedba.modules.student.repository.StudentRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BookSaleServiceTests {

    @Mock private BookSaleRepository repository;
    @Mock private BookSaleMapper mapper;
    @Mock private BookService bookService;
    @Mock private StudentRepository studentRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private BookAuthorRepository bookAuthorRepository;
    @Mock private BudgetService budgetService;

    private BookSaleService service;

    @BeforeEach
    void setUp() {
        service = new BookSaleService(
                repository, mapper, bookService,
                studentRepository, enrollmentRepository, bookAuthorRepository,
                budgetService);
        lenient().when(repository.save(any(BookSale.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(mapper.toResponse(any(BookSale.class))).thenAnswer(inv -> {
            BookSale s = inv.getArgument(0);
            return new BookSaleResponse(
                    s.getId(), s.getBook() == null ? null : s.getBook().getId(),
                    s.getBook() == null ? null : s.getBook().getName(),
                    null, null, s.getQuantity(), s.getUnitPrice(),
                    s.getStudentSale(), s.getTotalAmount(), s.getSaleDate(),
                    s.getSoldBy(), s.getNotes(), s.getCreatedAt());
        });
    }

    @Test
    @DisplayName("venta a alumno con applyStudentDiscount aplica 30% al precio base")
    void student_discount_30pct() {
        UUID bookId = UUID.randomUUID();
        Book b = Book.builder()
                .salePrice(new BigDecimal("100.00"))
                .studentDiscountPct(new BigDecimal("30.00"))
                .stockQuantity(10)
                .build();
        b.setId(bookId);
        b.setName("Anatomía");
        when(bookService.reserveStock(bookId, 1)).thenReturn(b);

        var req = new BookSaleCreateRequest(bookId, null, null, 1, Boolean.TRUE, null);

        BookSaleResponse out = service.create(req);

        assertThat(out.unitPrice()).isEqualByComparingTo("70.00");
        assertThat(out.totalAmount()).isEqualByComparingTo("70.00");
        assertThat(out.studentSale()).isTrue();
    }

    @Test
    @DisplayName("venta sin descuento mantiene el precio base y total = qty * price")
    void public_sale_no_discount() {
        UUID bookId = UUID.randomUUID();
        Book b = Book.builder()
                .salePrice(new BigDecimal("100.00"))
                .studentDiscountPct(new BigDecimal("30.00"))
                .stockQuantity(10)
                .build();
        b.setId(bookId);
        b.setName("Fisio");
        when(bookService.reserveStock(bookId, 3)).thenReturn(b);

        var req = new BookSaleCreateRequest(bookId, null, null, 3, Boolean.FALSE, null);

        BookSaleResponse out = service.create(req);

        assertThat(out.unitPrice()).isEqualByComparingTo("100.00");
        assertThat(out.totalAmount()).isEqualByComparingTo("300.00");
        assertThat(out.studentSale()).isFalse();
    }

    @Test
    @DisplayName("royaltiesByPeriod suma total_amount por libro y reparte según porcentaje")
    void royalties_on_the_fly() {
        UUID bookA = UUID.randomUUID();
        UUID authorA = UUID.randomUUID();
        Book book = Book.builder().build();
        book.setId(bookA);
        book.setName("Libro A");

        BookSale s1 = BookSale.builder()
                .book(book).totalAmount(new BigDecimal("100.00"))
                .saleDate(Instant.now()).build();
        BookSale s2 = BookSale.builder()
                .book(book).totalAmount(new BigDecimal("50.00"))
                .saleDate(Instant.now()).build();

        Author author = Author.builder().firstName("Ana").lastName("Zeta").build();
        author.setId(authorA);
        BookAuthor ba = BookAuthor.builder()
                .book(book).author(author)
                .royaltyPercentage(new BigDecimal("20.00")).build();

        when(repository.findInPeriod(any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(s1, s2));
        when(bookAuthorRepository.findByBookId(bookA)).thenReturn(List.of(ba));

        List<RoyaltyLineResponse> lines = service.royaltiesByPeriod(2026, 4);

        assertThat(lines).hasSize(1);
        assertThat(lines.get(0).totalSales()).isEqualByComparingTo("150.00");
        // 150 * 20% = 30
        assertThat(lines.get(0).royaltyAmount()).isEqualByComparingTo("30.00");
        assertThat(lines.get(0).authorId()).isEqualTo(authorA);
    }
}
