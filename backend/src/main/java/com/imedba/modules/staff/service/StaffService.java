package com.imedba.modules.staff.service;

import com.imedba.common.error.NotFoundException;
import com.imedba.modules.staff.dto.StaffCreateRequest;
import com.imedba.modules.staff.dto.StaffResponse;
import com.imedba.modules.staff.dto.StaffUpdateRequest;
import com.imedba.modules.staff.entity.Staff;
import com.imedba.modules.staff.entity.StaffType;
import com.imedba.modules.staff.mapper.StaffMapper;
import com.imedba.modules.staff.repository.StaffRepository;
import com.imedba.modules.staff.repository.StaffSpecs;
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
public class StaffService {

    private final StaffRepository repository;
    private final StaffMapper mapper;

    @Transactional(readOnly = true)
    public Page<StaffResponse> list(StaffType type, Boolean active, String q, Pageable pageable) {
        Specification<Staff> spec = Specification.where(StaffSpecs.byType(type))
                .and(StaffSpecs.isActive(active))
                .and(StaffSpecs.textMatches(q));
        return repository.findAll(spec, pageable).map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public StaffResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    public StaffResponse create(StaffCreateRequest req) {
        Staff s = mapper.toEntity(req);
        s.setActive(Boolean.TRUE);
        return mapper.toResponse(repository.save(s));
    }

    public StaffResponse update(UUID id, StaffUpdateRequest req) {
        Staff s = find(id);
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

    private Staff find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Staff", id));
    }
}
