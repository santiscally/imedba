package com.imedba.modules.contact.service;

import com.imedba.common.error.ConflictException;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.contact.dto.ContactCreateRequest;
import com.imedba.modules.contact.dto.ContactResponse;
import com.imedba.modules.contact.dto.ContactUpdateRequest;
import com.imedba.modules.contact.entity.Contact;
import com.imedba.modules.contact.entity.ContactType;
import com.imedba.modules.contact.mapper.ContactMapper;
import com.imedba.modules.contact.repository.ContactRepository;
import com.imedba.modules.contact.repository.ContactSpecs;
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
public class ContactService {

    private final ContactRepository repository;
    private final ContactMapper mapper;

    @Transactional(readOnly = true)
    public Page<ContactResponse> list(ContactType type, Boolean active, String q,
                                      Pageable pageable) {
        Specification<Contact> spec = Specification.where(ContactSpecs.byType(type))
                .and(ContactSpecs.isActive(active))
                .and(ContactSpecs.textMatches(q));
        return repository.findAll(spec, pageable).map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public ContactResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    public ContactResponse create(ContactCreateRequest req) {
        validateShape(req.contactType(), req.firstName(), req.lastName(), req.companyName());
        Contact c = mapper.toEntity(req);
        c.setActive(Boolean.TRUE);
        return mapper.toResponse(repository.save(c));
    }

    public ContactResponse update(UUID id, ContactUpdateRequest req) {
        Contact c = find(id);
        mapper.updateEntity(req, c);
        validateShape(
                c.getContactType(), c.getFirstName(), c.getLastName(), c.getCompanyName());
        return mapper.toResponse(c);
    }

    public void deactivate(UUID id) {
        Contact c = find(id);
        c.setActive(Boolean.FALSE);
    }

    private void validateShape(ContactType type, String firstName, String lastName,
                               String companyName) {
        if (type == ContactType.EMPLEADO) {
            if (isBlank(firstName) || isBlank(lastName)) {
                throw new ConflictException(
                        "EMPLEADO requires both firstName and lastName");
            }
        } else if (type == ContactType.PROVEEDOR) {
            if (isBlank(companyName)) {
                throw new ConflictException("PROVEEDOR requires companyName");
            }
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private Contact find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Contact", id));
    }
}
