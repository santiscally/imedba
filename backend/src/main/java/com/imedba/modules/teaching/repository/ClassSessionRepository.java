package com.imedba.modules.teaching.repository;

import com.imedba.modules.teaching.entity.ClassSession;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ClassSessionRepository
        extends JpaRepository<ClassSession, UUID>, JpaSpecificationExecutor<ClassSession> {

    /**
     * Clases <b>sincrónicas</b> del período donde la persona figura como docente.
     * Las asincrónicas quedan fuera de la liquidación entera (Nico, 2026-07-30).
     */
    @Query("""
           SELECT c FROM ClassSession c
            WHERE c.teacher.id = :staffId
              AND c.synchronous = true
              AND c.sessionDate >= :from AND c.sessionDate < :to
            ORDER BY c.sessionDate ASC
           """)
    List<ClassSession> findTeachingSessions(
            @Param("staffId") UUID staffId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /** Ídem, pero donde la persona figura como preceptora de la clase. */
    @Query("""
           SELECT c FROM ClassSession c
            WHERE c.preceptor.id = :staffId
              AND c.synchronous = true
              AND c.sessionDate >= :from AND c.sessionDate < :to
            ORDER BY c.sessionDate ASC
           """)
    List<ClassSession> findPreceptorSessions(
            @Param("staffId") UUID staffId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /**
     * Quiénes dieron o acompañaron clases sincrónicas en el período — para ofrecer
     * a quién liquidar sin que el usuario tenga que adivinar.
     */
    @Query("""
           SELECT DISTINCT c.teacher.id FROM ClassSession c
            WHERE c.teacher IS NOT NULL AND c.synchronous = true
              AND c.sessionDate >= :from AND c.sessionDate < :to
           """)
    List<UUID> findTeachersWithSessions(
            @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("""
           SELECT DISTINCT c.preceptor.id FROM ClassSession c
            WHERE c.preceptor IS NOT NULL AND c.synchronous = true
              AND c.sessionDate >= :from AND c.sessionDate < :to
           """)
    List<UUID> findPreceptorsWithSessions(
            @Param("from") LocalDate from, @Param("to") LocalDate to);
}
