package com.imedba.modules.book.repository;

import com.imedba.modules.book.entity.Book;
import org.springframework.data.jpa.domain.Specification;

public final class BookSpecs {

    private BookSpecs() {}

    public static Specification<Book> isActive(Boolean active) {
        if (active == null) return null;
        return (root, q, cb) -> cb.equal(root.get("active"), active);
    }

    public static Specification<Book> bySpecialty(String specialty) {
        if (specialty == null || specialty.isBlank()) return null;
        return (root, q, cb) -> cb.equal(cb.lower(root.get("specialty")), specialty.toLowerCase());
    }

    public static Specification<Book> byBranch(String branch) {
        if (branch == null || branch.isBlank()) return null;
        return (root, q, cb) -> cb.equal(cb.lower(root.get("branch")), branch.toLowerCase());
    }

    public static Specification<Book> nameContains(String q) {
        if (q == null || q.isBlank()) return null;
        String like = "%" + q.toLowerCase() + "%";
        return (root, cq, cb) -> cb.like(cb.lower(root.get("name")), like);
    }
}
