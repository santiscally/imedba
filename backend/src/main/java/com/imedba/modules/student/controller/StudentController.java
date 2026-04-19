package com.imedba.modules.student.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.modules.student.dto.StudentCreateRequest;
import com.imedba.modules.student.dto.StudentResponse;
import com.imedba.modules.student.dto.StudentUpdateRequest;
import com.imedba.modules.student.service.StudentService;
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
@RequestMapping("/api/v1/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService service;

    @GetMapping
    @PreAuthorize("hasAuthority('students:read')")
    public PageResponse<StudentResponse> list(
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return PageResponse.of(service.list(q, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('students:read')")
    public StudentResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('students:write')")
    public ResponseEntity<StudentResponse> create(@Valid @RequestBody StudentCreateRequest req) {
        StudentResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/students/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('students:write')")
    public StudentResponse update(@PathVariable UUID id, @Valid @RequestBody StudentUpdateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('students:write')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
