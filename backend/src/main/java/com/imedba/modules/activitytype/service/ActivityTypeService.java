package com.imedba.modules.activitytype.service;

import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.activitytype.dto.ActivityTypeCreateRequest;
import com.imedba.modules.activitytype.dto.ActivityTypeResponse;
import com.imedba.modules.activitytype.dto.ActivityTypeUpdateRequest;
import com.imedba.modules.activitytype.entity.ActivityType;
import com.imedba.modules.activitytype.mapper.ActivityTypeMapper;
import com.imedba.modules.activitytype.repository.ActivityTypeRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ActivityTypeService {

    private final ActivityTypeRepository repository;
    private final ActivityTypeMapper mapper;

    @Transactional(readOnly = true)
    public List<ActivityTypeResponse> list(Boolean onlyActive) {
        List<ActivityType> items = Boolean.TRUE.equals(onlyActive)
                ? repository.findAllByActiveTrueOrderByName()
                : repository.findAll();
        return items.stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ActivityTypeResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    public ActivityTypeResponse create(ActivityTypeCreateRequest req) {
        repository.findByName(req.name()).ifPresent(a -> {
            throw new ConflictException("ActivityType ya existe: " + req.name());
        });
        ActivityType a = mapper.toEntity(req);
        a.setActive(Boolean.TRUE);
        return mapper.toResponse(repository.save(a));
    }

    public ActivityTypeResponse update(UUID id, ActivityTypeUpdateRequest req) {
        ActivityType a = find(id);
        mapper.updateEntity(req, a);
        return mapper.toResponse(a);
    }

    public ActivityType findEntity(UUID id) {
        return find(id);
    }

    public ActivityType findByNameOrThrow(String name) {
        return repository.findByName(name)
                .orElseThrow(() -> NotFoundException.of("ActivityType", name));
    }

    private ActivityType find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("ActivityType", id));
    }
}
