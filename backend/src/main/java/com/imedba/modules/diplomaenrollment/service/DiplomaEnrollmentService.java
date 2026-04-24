package com.imedba.modules.diplomaenrollment.service;

import com.imedba.common.error.NotFoundException;
import com.imedba.modules.diploma.entity.Diploma;
import com.imedba.modules.diploma.service.DiplomaService;
import com.imedba.modules.diplomaenrollment.dto.DiplomaEnrollmentCreateRequest;
import com.imedba.modules.diplomaenrollment.dto.DiplomaEnrollmentResponse;
import com.imedba.modules.diplomaenrollment.dto.DiplomaEnrollmentUpdateRequest;
import com.imedba.modules.diplomaenrollment.entity.DiplomaEnrollment;
import com.imedba.modules.diplomaenrollment.entity.DiplomaEnrollmentStatus;
import com.imedba.modules.diplomaenrollment.mapper.DiplomaEnrollmentMapper;
import com.imedba.modules.diplomaenrollment.repository.DiplomaEnrollmentRepository;
import com.imedba.modules.diplomaenrollment.repository.DiplomaEnrollmentSpecs;
import com.imedba.modules.student.entity.Student;
import com.imedba.modules.student.repository.StudentRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class DiplomaEnrollmentService {

    private final DiplomaEnrollmentRepository repository;
    private final DiplomaEnrollmentMapper mapper;
    private final DiplomaService diplomaService;
    private final StudentRepository studentRepository;

    public DiplomaEnrollmentResponse create(DiplomaEnrollmentCreateRequest req) {
        Diploma diploma = diplomaService.findEntity(req.diplomaId());
        Student student = studentRepository.findById(req.studentId())
                .orElseThrow(() -> NotFoundException.of("Student", req.studentId()));

        DiplomaEnrollment e = DiplomaEnrollment.builder()
                .diploma(diploma)
                .student(student)
                .enrollmentDate(req.enrollmentDate() != null ? req.enrollmentDate() : LocalDate.now())
                .numInstallments(req.numInstallments() != null ? req.numInstallments() : 1)
                .paymentMethod(req.paymentMethod())
                .status(DiplomaEnrollmentStatus.ACTIVE)
                .pendingAmount(req.pendingAmount() != null ? req.pendingAmount() : BigDecimal.ZERO)
                .notes(req.notes())
                .build();
        return mapper.toResponse(repository.save(e));
    }

    @Transactional(readOnly = true)
    public DiplomaEnrollmentResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    @Transactional(readOnly = true)
    public Page<DiplomaEnrollmentResponse> list(UUID diplomaId, UUID studentId,
                                                DiplomaEnrollmentStatus status,
                                                Pageable pageable) {
        Specification<DiplomaEnrollment> spec = Specification
                .where(DiplomaEnrollmentSpecs.byDiploma(diplomaId))
                .and(DiplomaEnrollmentSpecs.byStudent(studentId))
                .and(DiplomaEnrollmentSpecs.byStatus(status));
        return repository.findAll(spec, pageable).map(mapper::toResponse);
    }

    public DiplomaEnrollmentResponse update(UUID id, DiplomaEnrollmentUpdateRequest req) {
        DiplomaEnrollment e = find(id);
        if (req.enrollmentDate() != null) e.setEnrollmentDate(req.enrollmentDate());
        if (req.numInstallments() != null) e.setNumInstallments(req.numInstallments());
        if (req.paymentMethod() != null) e.setPaymentMethod(req.paymentMethod());
        if (req.status() != null) e.setStatus(req.status());
        if (req.pendingAmount() != null) e.setPendingAmount(req.pendingAmount());
        if (req.notes() != null) e.setNotes(req.notes());
        return mapper.toResponse(e);
    }

    private DiplomaEnrollment find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("DiplomaEnrollment", id));
    }
}
