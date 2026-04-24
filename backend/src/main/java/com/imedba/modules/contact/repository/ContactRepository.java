package com.imedba.modules.contact.repository;

import com.imedba.modules.contact.entity.Contact;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface ContactRepository extends JpaRepository<Contact, UUID>,
        JpaSpecificationExecutor<Contact> {}
