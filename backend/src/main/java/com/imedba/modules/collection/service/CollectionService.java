package com.imedba.modules.collection.service;

import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.book.entity.Book;
import com.imedba.modules.book.repository.BookRepository;
import com.imedba.modules.booksale.dto.BookSaleResponse;
import com.imedba.modules.booksale.entity.BookSale;
import com.imedba.modules.booksale.mapper.BookSaleMapper;
import com.imedba.modules.booksale.service.BookSaleService;
import com.imedba.modules.collection.dto.CollectionCreateRequest;
import com.imedba.modules.collection.dto.CollectionResponse;
import com.imedba.modules.collection.dto.CollectionSellRequest;
import com.imedba.modules.collection.entity.Collection;
import com.imedba.modules.collection.repository.CollectionRepository;
import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.enrollment.repository.EnrollmentRepository;
import com.imedba.modules.student.entity.Student;
import com.imedba.modules.student.repository.StudentRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class CollectionService {

    private final CollectionRepository repository;
    private final BookRepository bookRepository;
    private final BookSaleService bookSaleService;
    private final BookSaleMapper bookSaleMapper;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Transactional(readOnly = true)
    public List<CollectionResponse> list(Boolean activeOnly) {
        return repository.findAll().stream()
                .filter(c -> !Boolean.TRUE.equals(activeOnly) || Boolean.TRUE.equals(c.getActive()))
                .map(CollectionService::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CollectionResponse get(UUID id) {
        return toResponse(find(id));
    }

    public CollectionResponse create(CollectionCreateRequest req) {
        Collection c = Collection.builder()
                .name(req.name().trim())
                .variant(req.variant())
                .price(req.price())
                .studentDiscountPct(req.studentDiscountPct() != null
                        ? req.studentDiscountPct() : new BigDecimal("35.00"))
                .active(req.active() == null ? Boolean.TRUE : req.active())
                .books(loadBooks(req.bookIds()))
                .build();
        return toResponse(repository.save(c));
    }

    public CollectionResponse update(UUID id, CollectionCreateRequest req) {
        Collection c = find(id);
        c.setName(req.name().trim());
        c.setVariant(req.variant());
        c.setPrice(req.price());
        if (req.studentDiscountPct() != null) c.setStudentDiscountPct(req.studentDiscountPct());
        if (req.active() != null) c.setActive(req.active());
        c.setBooks(loadBooks(req.bookIds()));
        return toResponse(c);
    }

    public void delete(UUID id) {
        repository.delete(find(id));
    }

    /**
     * Vende una colección: genera una venta por libro, repartiendo el precio de la
     * colección proporcional al precio de lista (salePrice) de cada libro. Si se pide
     * descuento alumno, se aplica el % de la colección al total antes de repartir. La
     * última cuota absorbe el redondeo para que la suma sea exacta.
     */
    public List<BookSaleResponse> sell(UUID id, CollectionSellRequest req) {
        Collection c = find(id);
        List<Book> books = c.getBooks();
        if (books.isEmpty()) {
            throw new ConflictException("La colección no tiene libros");
        }

        Student student = req.studentId() == null ? null
                : studentRepository.findById(req.studentId())
                        .orElseThrow(() -> NotFoundException.of("Student", req.studentId()));
        Enrollment enrollment = req.enrollmentId() == null ? null
                : enrollmentRepository.findById(req.enrollmentId())
                        .orElseThrow(() -> NotFoundException.of("Enrollment", req.enrollmentId()));
        boolean applyDiscount = Boolean.TRUE.equals(req.applyStudentDiscount());
        boolean studentSale = applyDiscount || student != null || enrollment != null;

        BigDecimal total = c.getPrice();
        if (applyDiscount) {
            BigDecimal pct = c.getStudentDiscountPct() == null ? BigDecimal.ZERO : c.getStudentDiscountPct();
            BigDecimal factor = BigDecimal.ONE.subtract(pct.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
            total = total.multiply(factor).setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal sumSale = books.stream()
                .map(b -> b.getSalePrice() == null ? BigDecimal.ZERO : b.getSalePrice())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String note = "Venta colección: " + c.getName();
        List<BookSaleResponse> out = new ArrayList<>();
        BigDecimal allocated = BigDecimal.ZERO;
        for (int i = 0; i < books.size(); i++) {
            Book b = books.get(i);
            BigDecimal share;
            if (i == books.size() - 1) {
                share = total.subtract(allocated);                       // absorbe redondeo
            } else if (sumSale.signum() == 0) {
                share = total.divide(BigDecimal.valueOf(books.size()), 2, RoundingMode.HALF_UP);
            } else {
                BigDecimal price = b.getSalePrice() == null ? BigDecimal.ZERO : b.getSalePrice();
                share = total.multiply(price).divide(sumSale, 2, RoundingMode.HALF_UP);
            }
            allocated = allocated.add(share);
            BookSale sale = bookSaleService.createForCollection(
                    b.getId(), share, studentSale, student, enrollment, note);
            out.add(bookSaleMapper.toResponse(sale));
        }
        return out;
    }

    // ---- helpers ----

    private Collection find(UUID id) {
        return repository.findById(id).orElseThrow(() -> NotFoundException.of("Collection", id));
    }

    private List<Book> loadBooks(List<UUID> bookIds) {
        if (bookIds == null || bookIds.isEmpty()) {
            return new ArrayList<>();
        }
        List<Book> books = bookRepository.findAllById(bookIds);
        if (books.size() != bookIds.size()) {
            throw new ConflictException("Uno o más libros de la colección no existen");
        }
        return new ArrayList<>(books);
    }

    private static CollectionResponse toResponse(Collection c) {
        List<CollectionResponse.BookSummary> books = c.getBooks().stream()
                .map(b -> new CollectionResponse.BookSummary(
                        b.getId(), b.getName(), b.getCode(), b.getSalePrice()))
                .toList();
        return new CollectionResponse(
                c.getId(), c.getName(), c.getVariant(), c.getPrice(),
                c.getStudentDiscountPct(), c.getActive(), books,
                c.getCreatedAt(), c.getUpdatedAt());
    }
}
