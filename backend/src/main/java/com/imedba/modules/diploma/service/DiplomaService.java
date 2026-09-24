package com.imedba.modules.diploma.service;

import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.course.entity.Course;
import com.imedba.modules.course.repository.CourseRepository;
import com.imedba.modules.course.service.CourseService;
import com.imedba.modules.diploma.dto.CommissionRequest;
import com.imedba.modules.diploma.dto.CommissionResponse;
import com.imedba.modules.diploma.dto.DiplomaCreateRequest;
import com.imedba.modules.diploma.dto.DiplomaResponse;
import com.imedba.modules.diploma.dto.DiplomaUpdateRequest;
import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.diploma.mapper.DiplomaMapper;
import com.imedba.modules.diploma.repository.DiplomaRepository;
import com.imedba.modules.staff.entity.Staff;
import com.imedba.modules.staff.entity.StaffType;
import com.imedba.modules.staff.repository.StaffRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
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
    private final CourseService courseService;
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
        Diploma d = repository.save(Diploma.builder()
                .name(req.name())
                .universityName(req.universityName())
                .description(req.description())
                .directors(new ArrayList<>(resolveDirectors(req.directorIds())))
                .active(Boolean.TRUE)
                .build());
        if (req.firstCommission() != null) {
            addCommission(d, req.firstCommission());
        }
        return mapper.toResponse(d);
    }

    public DiplomaResponse update(UUID id, DiplomaUpdateRequest req) {
        Diploma d = find(id);
        if (req.name() != null) {
            d.setName(req.name());
            d.getCommissions().forEach(c -> c.setName(commissionName(d, c.getCommission())));
        }
        if (req.universityName() != null) d.setUniversityName(req.universityName());
        if (req.description() != null) d.setDescription(req.description());
        // null = no tocar; lista (incluso vacía) = reemplaza el set completo.
        if (req.directorIds() != null) {
            d.getDirectors().clear();
            d.getDirectors().addAll(resolveDirectors(req.directorIds()));
        }
        if (req.active() != null) {
            d.setActive(req.active());
            if (!req.active()) d.getCommissions().forEach(c -> c.setActive(Boolean.FALSE));
        }
        return mapper.toResponse(d);
    }

    public CommissionResponse createCommission(UUID diplomaId, CommissionRequest req) {
        return mapper.toCommissionDto(addCommission(find(diplomaId), req));
    }

    public CommissionResponse updateCommission(UUID diplomaId, UUID courseId, CommissionRequest req) {
        Diploma d = find(diplomaId);
        Course c = findCommission(d, courseId);
        requireFreeNumber(d, req.commission(), c.getId());
        CourseService.requireValidDates(req.startDate(), req.endDate());
        applyCommission(d, c, req);
        if (req.active() != null) c.setActive(req.active());
        return mapper.toCommissionDto(c);
    }

    public void deleteCommission(UUID diplomaId, UUID courseId) {
        Diploma d = find(diplomaId);
        Course c = findCommission(d, courseId);
        courseService.deleteCourse(c);
        d.getCommissions().remove(c);
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
        d.getCommissions().forEach(c -> c.setActive(Boolean.FALSE));
    }

    public Diploma findEntity(UUID id) {
        return find(id);
    }

    private Course addCommission(Diploma d, CommissionRequest req) {
        requireFreeNumber(d, req.commission(), null);
        CourseService.requireValidDates(req.startDate(), req.endDate());
        Course c = Course.builder()
                .businessUnit(BusinessUnit.FORMACION_SUPERIOR)
                .diploma(d)
                .active(req.active() == null ? Boolean.TRUE : req.active())
                .build();
        applyCommission(d, c, req);
        Course saved = courseRepository.save(c);
        d.getCommissions().add(0, saved);
        return saved;
    }

    private static void applyCommission(Diploma d, Course c, CommissionRequest req) {
        c.setName(commissionName(d, req.commission()));
        c.setCommission(req.commission());
        c.setAcademicYear(req.academicYear());
        c.setEnrollmentPrice(req.enrollmentPrice());
        c.setCoursePrice(req.coursePrice());
        c.setIncludesPremaBook(Boolean.TRUE.equals(req.includesPremaBook()));
        c.setStartDate(req.startDate());
        c.setEndDate(req.endDate());
        c.setModality(req.modality());
        c.setMoodleCourseId(req.moodleCourseId());
    }

    private static void requireFreeNumber(Diploma d, Integer number, UUID exceptCourseId) {
        boolean taken = d.getCommissions().stream()
                .anyMatch(c -> Objects.equals(c.getCommission(), number)
                        && !c.getId().equals(exceptCourseId));
        if (taken) {
            throw new ConflictException("La diplomatura ya tiene una comisión " + number);
        }
    }

    private static Course findCommission(Diploma d, UUID courseId) {
        return d.getCommissions().stream()
                .filter(c -> c.getId().equals(courseId))
                .findFirst()
                .orElseThrow(() -> NotFoundException.of("Commission", courseId));
    }

    private static String commissionName(Diploma d, Integer number) {
        return truncate(d.getName() + " · Comisión " + number, 200);
    }

    private static String truncate(String s, int max) {
        return s != null && s.length() > max ? s.substring(0, max) : s;
    }

    private Diploma find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Diploma", id));
    }
}
