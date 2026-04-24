package com.imedba.modules.budget.controller;

import com.imedba.common.dto.PageResponse;
import com.imedba.modules.budget.dto.BudgetEntryCreateRequest;
import com.imedba.modules.budget.dto.BudgetEntryResponse;
import com.imedba.modules.budget.dto.BudgetSummaryResponse;
import com.imedba.modules.budget.dto.CategoryBreakdownResponse;
import com.imedba.modules.budget.dto.MonthlyFlowResponse;
import com.imedba.modules.budget.entity.BudgetCategory;
import com.imedba.modules.budget.entity.BusinessUnit;
import com.imedba.modules.budget.entity.EntryType;
import com.imedba.modules.budget.service.BudgetService;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/budget")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService service;

    @GetMapping("/entries")
    @PreAuthorize("hasAuthority('budget:read')")
    public PageResponse<BudgetEntryResponse> list(
            @RequestParam(required = false) EntryType type,
            @RequestParam(required = false) BudgetCategory category,
            @RequestParam(required = false) BusinessUnit businessUnit,
            @RequestParam(required = false) UUID contactId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to,
            @RequestParam(required = false) Boolean projected,
            @PageableDefault(size = 20, sort = "entryDate") Pageable pageable) {
        return PageResponse.of(service.list(type, category, businessUnit, contactId,
                from, to, projected, pageable));
    }

    @GetMapping("/entries/{id}")
    @PreAuthorize("hasAuthority('budget:read')")
    public BudgetEntryResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping("/entries")
    @PreAuthorize("hasAuthority('budget:write')")
    public ResponseEntity<BudgetEntryResponse> create(
            @Valid @RequestBody BudgetEntryCreateRequest req) {
        BudgetEntryResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/budget/entries/" + created.id()))
                .body(created);
    }

    @GetMapping("/dashboard/summary")
    @PreAuthorize("hasAuthority('budget:read')")
    public BudgetSummaryResponse summary(@RequestParam int year, @RequestParam int month) {
        return service.summary(year, month);
    }

    @GetMapping("/dashboard/breakdown")
    @PreAuthorize("hasAuthority('budget:read')")
    public List<CategoryBreakdownResponse> breakdown(
            @RequestParam int year, @RequestParam int month) {
        return service.breakdown(year, month);
    }

    @GetMapping("/dashboard/monthly-flow")
    @PreAuthorize("hasAuthority('budget:read')")
    public List<MonthlyFlowResponse> monthlyFlow(@RequestParam int year) {
        return service.monthlyFlow(year);
    }
}
