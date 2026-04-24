package com.imedba.modules.booksale.repository;

import com.imedba.modules.booksale.entity.BookSale;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public final class BookSaleSpecs {

    private BookSaleSpecs() {}

    public static Specification<BookSale> byBook(UUID bookId) {
        if (bookId == null) return null;
        return (root, q, cb) -> cb.equal(root.get("book").get("id"), bookId);
    }

    public static Specification<BookSale> byStudent(UUID studentId) {
        if (studentId == null) return null;
        return (root, q, cb) -> cb.equal(root.get("student").get("id"), studentId);
    }

    public static Specification<BookSale> byEnrollment(UUID enrollmentId) {
        if (enrollmentId == null) return null;
        return (root, q, cb) -> cb.equal(root.get("enrollment").get("id"), enrollmentId);
    }

    public static Specification<BookSale> bySoldBy(UUID soldBy) {
        if (soldBy == null) return null;
        return (root, q, cb) -> cb.equal(root.get("soldBy"), soldBy);
    }

    public static Specification<BookSale> from(Instant from) {
        if (from == null) return null;
        return (root, q, cb) -> cb.greaterThanOrEqualTo(root.get("saleDate"), from);
    }

    public static Specification<BookSale> to(Instant to) {
        if (to == null) return null;
        return (root, q, cb) -> cb.lessThan(root.get("saleDate"), to);
    }
}
