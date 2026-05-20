package com.imedba.modules.course.service;

import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.common.security.SegmentationFilter;
import com.imedba.modules.course.dto.CourseCreateRequest;
import com.imedba.modules.course.dto.CourseResponse;
import com.imedba.modules.course.dto.CourseUpdateRequest;
import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.course.entity.Course;
import com.imedba.modules.course.mapper.CourseMapper;
import com.imedba.modules.course.repository.CourseRepository;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class CourseService {

    private final CourseRepository repository;
    private final CourseMapper mapper;

    @Transactional(readOnly = true)
    public Page<CourseResponse> list(String q, BusinessUnit businessUnit, String country, Boolean active, Pageable pageable) {
        Set<BusinessUnit> allowed = SegmentationFilter.allowedBusinessUnits();
        if (businessUnit != null && !allowed.contains(businessUnit)) {
            return Page.empty(pageable);
        }
        String search = (q == null || q.isBlank()) ? "" : q.trim().toLowerCase();
        return repository.search(search, businessUnit, allowed, country, active, pageable)
                .map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public CourseResponse get(UUID id) {
        Course c = find(id);
        ensureVisible(c);
        return mapper.toResponse(c);
    }

    public CourseResponse create(CourseCreateRequest req) {
        if (!SegmentationFilter.canSee(req.businessUnit())) {
            throw new AccessDeniedException("No tiene permisos para crear cursos de " + req.businessUnit());
        }
        if (req.code() != null && !req.code().isBlank() && repository.existsByCodeIgnoreCase(req.code())) {
            throw new ConflictException("Ya existe un curso con el código: " + req.code());
        }
        Course c = mapper.toEntity(req);
        if (req.active() == null) {
            c.setActive(Boolean.TRUE);
        }
        if (c.getCountry() == null) {
            c.setCountry("AR");
        }
        return mapper.toResponse(repository.save(c));
    }

    public CourseResponse update(UUID id, CourseUpdateRequest req) {
        Course c = find(id);
        ensureVisible(c);
        if (!SegmentationFilter.canSee(req.businessUnit())) {
            throw new AccessDeniedException("No tiene permisos para mover el curso a " + req.businessUnit());
        }
        if (req.code() != null
                && !req.code().equalsIgnoreCase(c.getCode())
                && repository.existsByCodeIgnoreCase(req.code())) {
            throw new ConflictException("Ya existe un curso con el código: " + req.code());
        }
        mapper.updateEntity(req, c);
        return mapper.toResponse(c);
    }

    public void delete(UUID id) {
        Course c = find(id);
        ensureVisible(c);
        repository.delete(c);
    }

    private Course find(UUID id) {
        return repository.findById(id).orElseThrow(() -> NotFoundException.of("Course", id));
    }

    private void ensureVisible(Course c) {
        if (!SegmentationFilter.canSee(c.getBusinessUnit())) {
            throw NotFoundException.of("Course", c.getId());
        }
    }
}
