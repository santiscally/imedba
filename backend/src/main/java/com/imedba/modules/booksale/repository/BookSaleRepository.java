package com.imedba.modules.booksale.repository;

import com.imedba.modules.booksale.entity.BookSale;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BookSaleRepository extends JpaRepository<BookSale, UUID>,
        JpaSpecificationExecutor<BookSale> {

    List<BookSale> findByBookIdAndSaleDateBetween(UUID bookId, Instant from, Instant to);

    @Query("""
            select s from BookSale s
            where s.saleDate >= :from and s.saleDate < :to
            """)
    List<BookSale> findInPeriod(@Param("from") Instant from, @Param("to") Instant to);
}
