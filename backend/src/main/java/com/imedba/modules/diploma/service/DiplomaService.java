package com.imedba.modules.diploma.service;

import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.diploma.dto.DiplomaCreateRequest;
import com.imedba.modules.diploma.dto.DiplomaResponse;
import com.imedba.modules.diploma.dto.DiplomaUpdateRequest;
import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.diploma.mapper.DiplomaMapper;
import com.imedba.modules.diploma.repository.DiplomaRepository;
import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.course.entity.Course;
import com.imedba.modules.course.repository.CourseRepository;
import com.imedba.modules.staff.entity.Staff;
import com.imedba.modules.staff.entity.StaffType;
import com.imedba.modules.staff.repository.StaffRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class DiplomaService {

    private final DiplomaRepository repository;
    private final DiplomaMapper mapper;
    private final CourseRepository courseRepository;
    private final StaffRepository staffRepository;

    @Transactional(readOnly = true)
    public List<DiplomaResponse> list(Boolean onlyActive) {
        List<Diploma> items = Boolean.TRUE.equals(onlyActive)
                ? repository.findAllByActiveTrueOrderByName()
                : repository.findAll();
        return items.stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public DiplomaResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    public DiplomaResponse create(DiplomaCreateRequest req) {
        Diploma d = Diploma.builder()
                .name(req.name())
                .universityName(req.universityName())
                // La diplomatura ES un curso (decisión 2026-06-09): se crea su curso
                // automáticamente en FS y la inscripción/cuotas pasan por él. No hay
                // vínculo manual.
                .course(createCourseFor(req))
                .description(req.description())
                .enrollmentPrice(req.enrollmentPrice())
                .coursePrice(req.coursePrice())
                .directors(new ArrayList<>(resolveDirectors(req.directorIds())))
                .active(Boolean.TRUE)
                .build();
        return mapper.toResponse(repository.save(d));
    }

    public DiplomaResponse update(UUID id, DiplomaUpdateRequest req) {
        Diploma d = find(id);
        if (req.name() != null) d.setName(req.name());
        if (req.universityName() != null) d.setUniversityName(req.universityName());
        if (req.description() != null) d.setDescription(req.description());
        if (req.enrollmentPrice() != null) d.setEnrollmentPrice(req.enrollmentPrice());
        if (req.coursePrice() != null) d.setCoursePrice(req.coursePrice());
        // null = no tocar; lista (incluso vacía) = reemplaza el set completo.
        if (req.directorIds() != null) {
            d.getDirectors().clear();
            d.getDirectors().addAll(resolveDirectors(req.directorIds()));
        }
        if (req.active() != null) d.setActive(req.active());
        syncCourse(d);
        return mapper.toResponse(d);
    }

    /**
     * Resuelve las directoras contra Personal Académico.
     *
     * <p>Exige que sean {@code DIRECTORA}: si alguien carga por error a una docente,
     * el error tiene que saltar acá y no aparecer como un reparto raro tres pasos
     * después, en la liquidación.
     */
    private List<Staff> resolveDirectors(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        List<Staff> out = new ArrayList<>(ids.size());
        for (UUID id : ids) {
            Staff s = staffRepository.findById(id)
                    .orElseThrow(() -> NotFoundException.of("Staff", id));
            if (s.getStaffType() != StaffType.DIRECTORA) {
                throw new ConflictException(
                        s.getFirstName() + " " + s.getLastName() + " no está cargada como"
                        + " directora en Personal Académico (rol actual: " + s.getStaffType() + ")");
            }
            out.add(s);
        }
        return out;
    }

    public void deactivate(UUID id) {
        Diploma d = find(id);
        d.setActive(Boolean.FALSE);
        if (d.getCourse() != null) {
            d.getCourse().setActive(Boolean.FALSE);
        }
    }

    public Diploma findEntity(UUID id) {
        return find(id);
    }

    /**
     * Crea el curso "espejo" de la diplomatura (unidad FORMACION_SUPERIOR). Es el curso
     * al que se inscriben los alumnos — aparece en Cursos/Inscripciones como cualquier
     * otro y la liquidación suma los pagos de sus inscripciones.
     */
    private Course createCourseFor(DiplomaCreateRequest req) {
        Course c = Course.builder()
                .name(truncate(req.name(), 200))
                .description(req.description())
                .businessUnit(BusinessUnit.FORMACION_SUPERIOR)
                .enrollmentPrice(req.enrollmentPrice())
                .coursePrice(req.coursePrice())
                .active(Boolean.TRUE)
                .build();
        return courseRepository.save(c);
    }

    /** Mantiene el curso espejo en sintonía con la diplomatura (nombre/precios/activo). */
    private void syncCourse(Diploma d) {
        Course c = d.getCourse();
        if (c == null) return;
        c.setName(truncate(d.getName(), 200));
        c.setDescription(d.getDescription());
        c.setEnrollmentPrice(d.getEnrollmentPrice());
        c.setCoursePrice(d.getCoursePrice());
        c.setActive(d.getActive());
    }

    private static String truncate(String s, int max) {
        return s != null && s.length() > max ? s.substring(0, max) : s;
    }

    private Diploma find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Diploma", id));
    }
}
