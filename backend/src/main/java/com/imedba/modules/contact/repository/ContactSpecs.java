package com.imedba.modules.contact.repository;

import com.imedba.modules.contact.entity.Contact;
import com.imedba.modules.contact.entity.ContactType;
import org.springframework.data.jpa.domain.Specification;

public final class ContactSpecs {

    private ContactSpecs() {}

    public static Specification<Contact> byType(ContactType type) {
        if (type == null) return null;
        return (root, q, cb) -> cb.equal(root.get("contactType"), type);
    }

    public static Specification<Contact> isActive(Boolean active) {
        if (active == null) return null;
        return (root, q, cb) -> cb.equal(root.get("active"), active);
    }

    public static Specification<Contact> textMatches(String query) {
        if (query == null || query.isBlank()) return null;
        String like = "%" + query.toLowerCase() + "%";
        return (root, q, cb) -> cb.or(
                cb.like(cb.lower(root.get("firstName")), like),
                cb.like(cb.lower(root.get("lastName")), like),
                cb.like(cb.lower(root.get("companyName")), like),
                cb.like(cb.lower(root.get("email")), like)
        );
    }
}
