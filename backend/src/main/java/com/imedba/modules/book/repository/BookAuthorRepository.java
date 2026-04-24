package com.imedba.modules.book.repository;

import com.imedba.modules.book.entity.BookAuthor;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookAuthorRepository extends JpaRepository<BookAuthor, UUID> {

    List<BookAuthor> findByBookId(UUID bookId);

    List<BookAuthor> findByAuthorId(UUID authorId);

    void deleteByBookIdAndAuthorId(UUID bookId, UUID authorId);
}
