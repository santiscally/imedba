package com.imedba.modules.student.repository;

import com.imedba.modules.student.entity.Student;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentRepository extends JpaRepository<Student, UUID> {

    boolean existsByEmailIgnoreCase(String email);

    /**
     * Búsqueda libre por nombre/apellido/email/DNI. Case-insensitive. Aprovecha el
     * índice GIN trigram sobre {@code lower(first_name || ' ' || last_name)}.
     *
     * <p>{@code q} DEBE venir no-null (usar {@code ""} para "sin filtro"). Pasar null
     * dispara el problema de inferencia de tipo de Postgres ({@code text ~~ bytea}).</p>
     *
     * @param q substring a buscar (ya en lowercase, sin comodines). La query agrega los %.
     */
    @Query("""
            SELECT s FROM Student s
            WHERE (
                  :q = ''
               OR LOWER(s.firstName || ' ' || s.lastName) LIKE CONCAT('%', :q, '%')
               OR LOWER(s.email)                           LIKE CONCAT('%', :q, '%')
               OR (s.dni IS NOT NULL AND LOWER(s.dni) LIKE CONCAT('%', :q, '%'))
            )
            """)
    Page<Student> search(@Param("q") String q, Pageable pageable);
}
