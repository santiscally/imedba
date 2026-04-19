package com.imedba.modules.course.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.modules.course.dto.CourseCreateRequest;
import com.imedba.modules.course.dto.CourseResponse;
import com.imedba.modules.course.dto.CourseUpdateRequest;
import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.course.service.CourseService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService service;

    @GetMapping
    @PreAuthorize("hasAuthority('courses:read')")
    public PageResponse<CourseResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) BusinessUnit businessUnit,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return PageResponse.of(service.list(q, businessUnit, active, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('courses:read')")
    public CourseResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('courses:write')")
    public ResponseEntity<CourseResponse> create(@Valid @RequestBody CourseCreateRequest req) {
        CourseResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/courses/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('courses:write')")
    public CourseResponse update(@PathVariable UUID id, @Valid @RequestBody CourseUpdateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('courses:write')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
