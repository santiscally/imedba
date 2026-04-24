package com.imedba.modules.author.service;

import com.imedba.common.error.NotFoundException;
import com.imedba.modules.author.dto.AuthorCreateRequest;
import com.imedba.modules.author.dto.AuthorResponse;
import com.imedba.modules.author.dto.AuthorUpdateRequest;
import com.imedba.modules.author.entity.Author;
import com.imedba.modules.author.mapper.AuthorMapper;
import com.imedba.modules.author.repository.AuthorRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthorService {

    private final AuthorRepository repository;
    private final AuthorMapper mapper;

    @Transactional(readOnly = true)
    public Page<AuthorResponse> list(Pageable pageable) {
        return repository.findAll(pageable).map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public AuthorResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    public AuthorResponse create(AuthorCreateRequest req) {
        Author a = mapper.toEntity(req);
        a.setActive(Boolean.TRUE);
        return mapper.toResponse(repository.save(a));
    }

    public AuthorResponse update(UUID id, AuthorUpdateRequest req) {
        Author a = find(id);
        mapper.updateEntity(req, a);
        return mapper.toResponse(a);
    }

    public void deactivate(UUID id) {
        Author a = find(id);
        a.setActive(Boolean.FALSE);
    }

    private Author find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Author", id));
    }
}
