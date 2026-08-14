package com.imedba.modules.staff.repository;

import com.imedba.modules.staff.entity.Staff;
import com.imedba.modules.staff.entity.StaffSegment;
import com.imedba.modules.staff.entity.StaffType;
import org.springframework.data.jpa.domain.Specification;

public final class StaffSpecs {

    private StaffSpecs() {}

    public static Specification<Staff> byType(StaffType type) {
        if (type == null) return null;
        return (root, q, cb) -> cb.equal(root.get("staffType"), type);
    }

    /**
     * Filtra por unidad de negocio (V034).
     *
     * <p>Filtrar por {@code RESIDENCIAS} o {@code FORMACION_SUPERIOR} <b>incluye</b> a
     * quienes tienen {@link StaffSegment#AMBAS}: si una docente da clases en las dos
     * unidades, tiene que aparecer al filtrar por cualquiera de ellas. Buscar
     * explícitamente por {@code AMBAS} devuelve sólo esas.
     */
    public static Specification<Staff> bySegment(StaffSegment segment) {
        if (segment == null) return null;
        if (segment == StaffSegment.AMBAS) {
            return (root, q, cb) -> cb.equal(root.get("segment"), StaffSegment.AMBAS);
        }
        return (root, q, cb) -> root.get("segment").in(segment, StaffSegment.AMBAS);
    }

    /** Sólo quienes además hacen seguimiento de alumnos (V036). */
    public static Specification<Staff> byTutor(Boolean tutor) {
        if (tutor == null) return null;
        return (root, q, cb) -> cb.equal(root.get("tutor"), tutor);
    }

    /** true = se liquida por horas; false = sueldo fijo (fuera de la liquidación por horas). */
    public static Specification<Staff> byPaidByHours(Boolean paidByHours) {
        if (paidByHours == null) return null;
        return (root, q, cb) -> cb.equal(root.get("paidByHours"), paidByHours);
    }

    public static Specification<Staff> isActive(Boolean active) {
        if (active == null) return null;
        return (root, q, cb) -> cb.equal(root.get("active"), active);
    }

    public static Specification<Staff> textMatches(String query) {
        if (query == null || query.isBlank()) return null;
        String like = "%" + query.toLowerCase() + "%";
        return (root, q, cb) -> cb.or(
                cb.like(cb.lower(root.get("firstName")), like),
                cb.like(cb.lower(root.get("lastName")), like),
                cb.like(cb.lower(root.get("email")), like),
                cb.like(cb.lower(root.get("dni")), like),
                cb.like(cb.lower(root.get("subject")), like)
        );
    }
}
