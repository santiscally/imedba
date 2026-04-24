package com.imedba.modules.activitytype.controller;

import com.imedba.modules.activitytype.dto.ActivityTypeCreateRequest;
import com.imedba.modules.activitytype.dto.ActivityTypeResponse;
import com.imedba.modules.activitytype.dto.ActivityTypeUpdateRequest;
import com.imedba.modules.activitytype.service.ActivityTypeService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/activity-types")
@RequiredArgsConstructor
public class ActivityTypeController {

    private final ActivityTypeService service;

    @GetMapping
    @PreAuthorize("hasAuthority('staff:read')")
    public List<ActivityTypeResponse> list(@RequestParam(required = false) Boolean onlyActive) {
        return service.list(onlyActive);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('staff:read')")
    public ActivityTypeResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('staff:write')")
    public ResponseEntity<ActivityTypeResponse> create(
            @Valid @RequestBody ActivityTypeCreateRequest req) {
        ActivityTypeResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/activity-types/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('staff:write')")
    public ActivityTypeResponse update(@PathVariable UUID id,
                                       @Valid @RequestBody ActivityTypeUpdateRequest req) {
        return service.update(id, req);
    }
}
