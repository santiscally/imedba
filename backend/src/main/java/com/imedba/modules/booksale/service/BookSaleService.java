package com.imedba.modules.booksale.service;

import com.imedba.common.auth.AuthUtils;
import com.imedba.common.error.NotFoundException;
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
import com.imedba.modules.booksale.repository.BookSaleSpecs;
import com.imedba.modules.budget.service.BudgetService;
import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.enrollment.repository.EnrollmentRepository;
import com.imedba.modules.student.entity.Student;
import com.imedba.modules.student.repository.StudentRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class BookSaleService {

    private static final ZoneId BA = ZoneId.of("America/Argentina/Buenos_Aires");

    private final BookSaleRepository repository;
    private final BookSaleMapper mapper;
    private final BookService bookService;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final BookAuthorRepository bookAuthorRepository;
    private final BudgetService budgetService;

    public BookSaleResponse create(BookSaleCreateRequest req) {
        Book book = bookService.reserveStock(req.bookId(), req.quantity());

        boolean isStudentSale = Boolean.TRUE.equals(req.applyStudentDiscount())
                || req.studentId() != null
                || req.enrollmentId() != null;

        BigDecimal unitPrice = book.getSalePrice();
        if (isStudentSale && Boolean.TRUE.equals(req.applyStudentDiscount())) {
            BigDecimal pct = book.getStudentDiscountPct() == null
                    ? BigDecimal.ZERO : book.getStudentDiscountPct();
            BigDecimal factor = BigDecimal.ONE.subtract(
                    pct.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
            unitPrice = unitPrice.multiply(factor).setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal total = unitPrice.multiply(BigDecimal.valueOf(req.quantity()))
                .setScale(2, RoundingMode.HALF_UP);

        Student student = req.studentId() == null ? null
                : studentRepository.findById(req.studentId())
                        .orElseThrow(() -> NotFoundException.of("Student", req.studentId()));
        Enrollment enrollment = req.enrollmentId() == null ? null
                : enrollmentRepository.findById(req.enrollmentId())
                        .orElseThrow(() -> NotFoundException.of("Enrollment", req.enrollmentId()));

        BookSale sale = BookSale.builder()
                .book(book)
                .student(student)
                .enrollment(enrollment)
                .quantity(req.quantity())
                .unitPrice(unitPrice)
                .studentSale(isStudentSale)
                .totalAmount(total)
                .saleDate(Instant.now())
                .soldBy(AuthUtils.currentUserId().orElse(null))
                .notes(req.notes())
                .build();
        BookSale saved = repository.save(sale);
        budgetService.linkFromBookSale(saved);
        return mapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public BookSaleResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    @Transactional(readOnly = true)
    public Page<BookSaleResponse> list(UUID bookId, UUID studentId, UUID enrollmentId,
                                       UUID soldBy, Instant from, Instant to, Pageable pageable) {
        Specification<BookSale> spec = Specification.where(BookSaleSpecs.byBook(bookId))
                .and(BookSaleSpecs.byStudent(studentId))
                .and(BookSaleSpecs.byEnrollment(enrollmentId))
                .and(BookSaleSpecs.bySoldBy(soldBy))
                .and(BookSaleSpecs.from(from))
                .and(BookSaleSpecs.to(to));
        return repository.findAll(spec, pageable).map(mapper::toResponse);
    }

    /**
     * Calcula royalties por período (mes calendario en TZ Argentina).
     * Por cada venta en el período, para cada BookAuthor del libro vendido:
     *   royaltyAmount += sale.total_amount * (royaltyPct / 100).
     * Una línea por (author, book).
     */
    @Transactional(readOnly = true)
    public List<RoyaltyLineResponse> royaltiesByPeriod(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        Instant from = ym.atDay(1).atStartOfDay(BA).toInstant();
        Instant to = ym.plusMonths(1).atDay(1).atStartOfDay(BA).toInstant();

        List<BookSale> sales = repository.findInPeriod(from, to);

        Map<UUID, BigDecimal> salesByBook = new HashMap<>();
        for (BookSale s : sales) {
            salesByBook.merge(s.getBook().getId(), s.getTotalAmount(), BigDecimal::add);
        }

        Map<String, RoyaltyLineResponse> lines = new HashMap<>();
        for (Map.Entry<UUID, BigDecimal> e : salesByBook.entrySet()) {
            UUID bookId = e.getKey();
            BigDecimal bookTotal = e.getValue();
            List<BookAuthor> authors = bookAuthorRepository.findByBookId(bookId);
            for (BookAuthor ba : authors) {
                BigDecimal pct = ba.getRoyaltyPercentage() == null
                        ? BigDecimal.ZERO : ba.getRoyaltyPercentage();
                BigDecimal royalty = bookTotal.multiply(pct)
                        .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                String key = ba.getAuthor().getId() + ":" + bookId;
                lines.put(key, new RoyaltyLineResponse(
                        ba.getAuthor().getId(),
                        ba.getAuthor().getFirstName(),
                        ba.getAuthor().getLastName(),
                        bookId,
                        ba.getBook().getName(),
                        pct,
                        bookTotal,
                        royalty
                ));
            }
        }

        List<RoyaltyLineResponse> out = new ArrayList<>(lines.values());
        out.sort(Comparator
                .comparing(RoyaltyLineResponse::lastName, Comparator.nullsLast(String::compareTo))
                .thenComparing(RoyaltyLineResponse::firstName, Comparator.nullsLast(String::compareTo))
                .thenComparing(RoyaltyLineResponse::bookName, Comparator.nullsLast(String::compareTo)));
        return out;
    }

    private BookSale find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("BookSale", id));
    }
}
