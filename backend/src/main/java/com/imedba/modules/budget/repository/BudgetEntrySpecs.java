package com.imedba.modules.budget.repository;

import com.imedba.modules.budget.entity.BudgetCategory;
import com.imedba.modules.budget.entity.BudgetEntry;
import com.imedba.modules.budget.entity.BusinessUnit;
import com.imedba.modules.budget.entity.EntryType;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public final class BudgetEntrySpecs {

    private BudgetEntrySpecs() {}

    public static Specification<BudgetEntry> byType(EntryType type) {
        if (type == null) return null;
        return (root, q, cb) -> cb.equal(root.get("entryType"), type);
    }

    public static Specification<BudgetEntry> byCategory(BudgetCategory cat) {
        if (cat == null) return null;
        return (root, q, cb) -> cb.equal(root.get("category"), cat);
    }

    public static Specification<BudgetEntry> byBusinessUnit(BusinessUnit bu) {
        if (bu == null) return null;
        return (root, q, cb) -> cb.equal(root.get("businessUnit"), bu);
    }

    public static Specification<BudgetEntry> byContact(UUID contactId) {
        if (contactId == null) return null;
        return (root, q, cb) -> cb.equal(root.get("contact").get("id"), contactId);
    }

    public static Specification<BudgetEntry> fromDate(LocalDate from) {
        if (from == null) return null;
        return (root, q, cb) -> cb.greaterThanOrEqualTo(root.get("entryDate"), from);
    }

    public static Specification<BudgetEntry> toDate(LocalDate to) {
        if (to == null) return null;
        return (root, q, cb) -> cb.lessThanOrEqualTo(root.get("entryDate"), to);
    }

    public static Specification<BudgetEntry> projected(Boolean projected) {
        if (projected == null) return null;
        return (root, q, cb) -> cb.equal(root.get("projected"), projected);
    }
}
