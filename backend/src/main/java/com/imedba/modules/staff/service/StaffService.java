package com.imedba.modules.staff.service;

import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.staff.dto.StaffCreateRequest;
import com.imedba.modules.staff.dto.StaffResponse;
import com.imedba.modules.staff.dto.StaffUpdateRequest;
import com.imedba.modules.staff.entity.Staff;
import com.imedba.modules.staff.entity.StaffSegment;
import com.imedba.modules.staff.entity.StaffType;
import com.imedba.modules.staff.mapper.StaffMapper;
import com.imedba.modules.staff.repository.StaffRepository;
import com.imedba.modules.staff.repository.StaffSpecs;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Personal Académico: docentes, tutoras, preceptoras y directoras (V034).
 *
 * <p>No es un padrón de inscripción — <i>"no es para inscribirlos en ningún lado"</i>
 * (Nico, 2026-07-24). Es un listado de contacto que además alimenta las liquidaciones:
 * las directoras se referencian desde la diplomatura, y las docentes y preceptoras
 * desde la grilla de horas.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class StaffService {

    private final StaffRepository repository;
    private final StaffMapper mapper;

    @Transactional(readOnly = true)
    public Page<StaffResponse> list(
            StaffType type, StaffSegment segment, Boolean paidByHours, Boolean tutor,
            Boolean active, String q, Pageable pageable) {
        Specification<Staff> spec = Specification.where(StaffSpecs.byType(type))
                .and(StaffSpecs.bySegment(segment))
                .and(StaffSpecs.byPaidByHours(paidByHours))
                .and(StaffSpecs.byTutor(tutor))
                .and(StaffSpecs.isActive(active))
                .and(StaffSpecs.textMatches(q));
        return repository.findAll(spec, pageable).map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public StaffResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    /** Activas de un rol, para poblar selectores (p.ej. las directoras de una diplomatura). */
    @Transactional(readOnly = true)
    public List<StaffResponse> listActiveByType(StaffType type) {
        return repository.findByStaffTypeAndActiveTrueOrderByLastNameAsc(type)
                .stream().map(mapper::toResponse).toList();
    }

    public StaffResponse create(StaffCreateRequest req) {
        requireDniAvailable(req.dni(), null);
        Staff s = mapper.toEntity(req);
        s.setActive(Boolean.TRUE);
        if (s.getPaidByHours() == null) {
            s.setPaidByHours(Boolean.TRUE);
        }
        if (s.getTutor() == null) {
            s.setTutor(Boolean.FALSE);
        }
        return mapper.toResponse(repository.save(s));
    }

    public StaffResponse update(UUID id, StaffUpdateRequest req) {
        Staff s = find(id);
        requireDniAvailable(req.dni(), id);
        mapper.updateEntity(req, s);
        return mapper.toResponse(s);
    }

    public void deactivate(UUID id) {
        Staff s = find(id);
        s.setActive(Boolean.FALSE);
    }

    public Staff findEntity(UUID id) {
        return find(id);
    }

    /**
     * El unique index de V034 ya lo impide, pero sin este chequeo el usuario recibe
     * un «Violación de integridad de datos» en vez de saber a quién ya tenía cargado.
     */
    private void requireDniAvailable(String dni, UUID selfId) {
        if (dni == null || dni.isBlank()) {
            return;
        }
        repository.findByDni(dni).ifPresent(other -> {
            if (!other.getId().equals(selfId)) {
                throw new ConflictException("Ya hay alguien cargado con el DNI " + dni
                        + ": " + other.getFirstName() + " " + other.getLastName());
            }
        });
    }

    private Staff find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Staff", id));
    }
}
