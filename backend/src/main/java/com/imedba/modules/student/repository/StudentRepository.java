package com.imedba.modules.student.repository;

import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.student.entity.Student;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentRepository extends JpaRepository<Student, UUID> {

    boolean existsByEmailIgnoreCase(String email);

    /** Alumnos todavía no vinculados a Moodle (sin {@code moodle_user_id}). Para el vínculo masivo. */
    List<Student> findByMoodleUserIdIsNull();

    /**
     * Búsqueda libre por nombre/apellido/email/DNI. Case-insensitive. Aprovecha el
     * índice GIN trigram sobre {@code lower(first_name || ' ' || last_name)}.
     *
     * <p>{@code q} DEBE venir no-null (usar {@code ""} para "sin filtro"). Pasar null
     * dispara el problema de inferencia de tipo de Postgres ({@code text ~~ bytea}).</p>
     *
     * @param q substring a buscar (ya en lowercase, sin comodines). La query agrega los %.
     * @param businessUnit alumnos de alta en esa unidad o con alguna inscripción en ella; null = todos.
     */
    @Query("""
            SELECT s FROM Student s
            WHERE (
                  :q = ''
               OR LOWER(s.firstName || ' ' || s.lastName) LIKE CONCAT('%', :q, '%')
               OR LOWER(s.email)                           LIKE CONCAT('%', :q, '%')
               OR (s.dni IS NOT NULL AND LOWER(s.dni) LIKE CONCAT('%', :q, '%'))
            )
              AND (:businessUnit IS NULL
               OR s.businessUnit = :businessUnit
               OR EXISTS (SELECT 1 FROM Enrollment e
                           WHERE e.student = s AND e.course.businessUnit = :businessUnit))
            """)
    Page<Student> search(@Param("q") String q,
                         @Param("businessUnit") BusinessUnit businessUnit,
                         Pageable pageable);
}
