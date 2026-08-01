package com.imedba.modules.book.repository;

import com.imedba.modules.book.entity.Book;
import com.imedba.modules.course.entity.BusinessUnit;
import org.springframework.data.jpa.domain.Specification;

public final class BookSpecs {

    private BookSpecs() {}

    /**
     * Libros ofrecibles en una unidad de negocio (V036).
     *
     * <p>Incluye los que no tienen unidad asignada: NULL significa «se vende en
     * todas», no «no se vende en ninguna». Sin esto, cualquier libro cargado sin
     * clasificar desaparecería del selector de la inscripción.
     *
     * <p>Pedido de Nico (2026-07-30): al matricular un alumno de Residencias el
     * sistema le dejaba sumar el libro de PREMA a la matrícula.
     */
    public static Specification<Book> availableIn(BusinessUnit unit) {
        if (unit == null) return null;
        return (root, q, cb) -> cb.or(
                cb.isNull(root.get("businessUnit")),
                cb.equal(root.get("businessUnit"), unit));
    }

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
