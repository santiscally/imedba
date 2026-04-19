package com.imedba.modules.student.service;

import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.student.dto.StudentCreateRequest;
import com.imedba.modules.student.dto.StudentResponse;
import com.imedba.modules.student.dto.StudentUpdateRequest;
import com.imedba.modules.student.entity.Student;
import com.imedba.modules.student.mapper.StudentMapper;
import com.imedba.modules.student.repository.StudentRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class StudentService {

    private final StudentRepository repository;
    private final StudentMapper mapper;

    @Transactional(readOnly = true)
    public Page<StudentResponse> list(String q, Pageable pageable) {
        Page<Student> page = (q == null || q.isBlank())
                ? repository.findAll(pageable)
                : repository.search(q.trim().toLowerCase(), pageable);
        return page.map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public StudentResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    public StudentResponse create(StudentCreateRequest req) {
        if (repository.existsByEmailIgnoreCase(req.email())) {
            throw new ConflictException("Ya existe un alumno con el email: " + req.email());
        }
        Student s = mapper.toEntity(req);
        if (req.active() == null) {
            s.setActive(Boolean.TRUE);
        }
        return mapper.toResponse(repository.save(s));
    }

    public StudentResponse update(UUID id, StudentUpdateRequest req) {
        Student s = find(id);
        if (!s.getEmail().equalsIgnoreCase(req.email())
                && repository.existsByEmailIgnoreCase(req.email())) {
            throw new ConflictException("Ya existe un alumno con el email: " + req.email());
        }
        mapper.updateEntity(req, s);
        return mapper.toResponse(s);
    }

    public void delete(UUID id) {
        Student s = find(id);
        repository.delete(s); // @SQLDelete → UPDATE deleted_at = NOW()
    }

    private Student find(UUID id) {
        return repository.findById(id).orElseThrow(() -> NotFoundException.of("Student", id));
    }
}
