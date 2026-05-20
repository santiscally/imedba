package com.imedba.modules.course.repository;

import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.course.entity.Course;
import java.util.Collection;
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
    /**
     * {@code allowedUnits} debe venir SIEMPRE con el conjunto permitido al caller.
     * El service la calcula a partir de las authorities del JWT (ver
     * {@code SegmentationFilter}). Para usuarios con visión total se pasan los 4
     * valores del enum.
     */
    @Query("""
            SELECT c FROM Course c
            WHERE (:businessUnit IS NULL OR c.businessUnit = :businessUnit)
              AND c.businessUnit IN :allowedUnits
              AND (:country IS NULL OR c.country = :country)
              AND (:active IS NULL OR c.active = :active)
              AND (:q = '' OR LOWER(c.name) LIKE CONCAT('%', :q, '%')
                           OR LOWER(COALESCE(c.code, '')) LIKE CONCAT('%', :q, '%'))
            """)
    Page<Course> search(
            @Param("q") String q,
            @Param("businessUnit") BusinessUnit businessUnit,
            @Param("allowedUnits") Collection<BusinessUnit> allowedUnits,
            @Param("country") String country,
            @Param("active") Boolean active,
            Pageable pageable);
}
