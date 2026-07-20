package com.imedba.modules.book.repository;

import com.imedba.modules.book.entity.Book;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface BookRepository extends JpaRepository<Book, UUID>, JpaSpecificationExecutor<Book> {

    /** Búsqueda por nombre exacto (usada para el auto-descuento del libro PREMA). */
    Optional<Book> findFirstByNameAndActiveTrue(String name);
}
