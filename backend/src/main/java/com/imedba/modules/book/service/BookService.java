package com.imedba.modules.book.service;

import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.author.entity.Author;
import com.imedba.modules.author.repository.AuthorRepository;
import com.imedba.modules.book.dto.BookAuthorRequest;
import com.imedba.modules.book.dto.BookCreateRequest;
import com.imedba.modules.book.dto.BookResponse;
import com.imedba.modules.book.dto.BookUpdateRequest;
import com.imedba.modules.book.entity.Book;
import com.imedba.modules.book.entity.BookAuthor;
import com.imedba.modules.book.mapper.BookMapper;
import com.imedba.modules.book.repository.BookAuthorRepository;
import com.imedba.modules.book.repository.BookRepository;
import com.imedba.modules.book.repository.BookSpecs;
import java.math.BigDecimal;
import java.util.List;
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
public class BookService {

    private final BookRepository bookRepository;
    private final BookAuthorRepository bookAuthorRepository;
    private final AuthorRepository authorRepository;
    private final BookMapper mapper;

    @Transactional(readOnly = true)
    public Page<BookResponse> list(String q, String specialty, String branch, Boolean active,
                                   Pageable pageable) {
        Specification<Book> spec = Specification.where(BookSpecs.nameContains(q))
                .and(BookSpecs.bySpecialty(specialty))
                .and(BookSpecs.byBranch(branch))
                .and(BookSpecs.isActive(active));
        return bookRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public BookResponse get(UUID id) {
        return toResponse(find(id));
    }

    public BookResponse create(BookCreateRequest req) {
        Book b = mapper.toEntity(req);
        if (b.getStudentDiscountPct() == null) {
            b.setStudentDiscountPct(new BigDecimal("30.00"));
        }
        if (b.getStockQuantity() == null) {
            b.setStockQuantity(0);
        }
        b.setActive(Boolean.TRUE);
        Book saved = bookRepository.save(b);

        if (req.authors() != null) {
            validateAuthorShares(req.authors());
            for (BookAuthorRequest link : req.authors()) {
                attachAuthor(saved, link);
            }
        }
        return toResponse(saved);
    }

    public BookResponse update(UUID id, BookUpdateRequest req) {
        Book b = find(id);
        mapper.updateEntity(req, b);
        return toResponse(b);
    }

    public void deactivate(UUID id) {
        Book b = find(id);
        b.setActive(Boolean.FALSE);
    }

    public BookResponse addAuthor(UUID bookId, BookAuthorRequest link) {
        Book b = find(bookId);
        Author a = authorRepository.findById(link.authorId())
                .orElseThrow(() -> NotFoundException.of("Author", link.authorId()));
        boolean already = bookAuthorRepository.findByBookId(bookId).stream()
                .anyMatch(ba -> ba.getAuthor().getId().equals(a.getId()));
        if (already) {
            throw new ConflictException(
                    "Author " + a.getId() + " already linked to book " + bookId);
        }
        BookAuthor ba = BookAuthor.builder()
                .book(b)
                .author(a)
                .royaltyPercentage(link.royaltyPercentage())
                .build();
        bookAuthorRepository.save(ba);
        validateTotalShare(bookId);
        return toResponse(b);
    }

    public void removeAuthor(UUID bookId, UUID authorId) {
        find(bookId);
        bookAuthorRepository.deleteByBookIdAndAuthorId(bookId, authorId);
    }

    /**
     * Reserva {@code qty} unidades del stock del libro. Si no alcanza, tira 409.
     * Se llama desde BookSaleService.
     */
    public Book reserveStock(UUID bookId, int qty) {
        if (qty <= 0) {
            throw new IllegalArgumentException("qty must be > 0");
        }
        Book b = find(bookId);
        Integer current = b.getStockQuantity() == null ? 0 : b.getStockQuantity();
        if (current < qty) {
            throw new ConflictException(
                    "Insufficient stock for book " + bookId + ": have=" + current + " need=" + qty);
        }
        b.setStockQuantity(current - qty);
        return b;
    }

    private void attachAuthor(Book book, BookAuthorRequest link) {
        Author a = authorRepository.findById(link.authorId())
                .orElseThrow(() -> NotFoundException.of("Author", link.authorId()));
        BookAuthor ba = BookAuthor.builder()
                .book(book)
                .author(a)
                .royaltyPercentage(link.royaltyPercentage())
                .build();
        bookAuthorRepository.save(ba);
    }

    private void validateAuthorShares(List<BookAuthorRequest> links) {
        BigDecimal total = links.stream()
                .map(BookAuthorRequest::royaltyPercentage)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(new BigDecimal("100.00")) > 0) {
            throw new ConflictException(
                    "Sum of royalty_percentage cannot exceed 100 (got " + total + ")");
        }
    }

    private void validateTotalShare(UUID bookId) {
        BigDecimal total = bookAuthorRepository.findByBookId(bookId).stream()
                .map(BookAuthor::getRoyaltyPercentage)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(new BigDecimal("100.00")) > 0) {
            throw new ConflictException(
                    "Sum of royalty_percentage for book " + bookId + " would exceed 100 ("
                            + total + ")");
        }
    }

    private Book find(UUID id) {
        return bookRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Book", id));
    }

    private BookResponse toResponse(Book b) {
        List<BookAuthor> links = bookAuthorRepository.findByBookId(b.getId());
        return mapper.toResponseWithAuthors(b, links);
    }
}
