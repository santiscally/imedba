package com.imedba.modules.course.repository;

import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.course.entity.Course;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CourseRepository extends JpaRepository<Course, UUID> {

    boolean existsByCodeIgnoreCase(String code);

    /**
     * {@code q} DEBE venir no-null (usar {@code ""} para "sin filtro"). Evita el
     * problema de inferencia de tipos de Postgres cuando un mismo parámetro se
     * usa en {@code IS NULL} y en {@code LIKE} — si es null, Postgres lo interpreta
     * como {@code bytea} y la query falla.
     */
    @Query("""
            SELECT c FROM Course c
            WHERE (:businessUnit IS NULL OR c.businessUnit = :businessUnit)
              AND (:active IS NULL OR c.active = :active)
              AND (:q = '' OR LOWER(c.name) LIKE CONCAT('%', :q, '%')
                           OR LOWER(COALESCE(c.code, '')) LIKE CONCAT('%', :q, '%'))
            """)
    Page<Course> search(
            @Param("q") String q,
            @Param("businessUnit") BusinessUnit businessUnit,
            @Param("active") Boolean active,
            Pageable pageable);
}
