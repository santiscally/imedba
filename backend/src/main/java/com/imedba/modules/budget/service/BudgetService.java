package com.imedba.modules.budget.service;

import com.imedba.common.auth.AuthUtils;
import com.imedba.common.error.NotFoundException;
import com.imedba.modules.booksale.entity.BookSale;
import com.imedba.modules.budget.dto.BudgetEntryCreateRequest;
import com.imedba.modules.budget.dto.BudgetEntryResponse;
import com.imedba.modules.budget.dto.BudgetSummaryResponse;
import com.imedba.modules.budget.dto.CategoryBreakdownResponse;
import com.imedba.modules.budget.dto.MonthlyFlowResponse;
import com.imedba.modules.budget.entity.BudgetCategory;
import com.imedba.modules.budget.entity.BudgetEntry;
import com.imedba.modules.budget.entity.BusinessUnit;
import com.imedba.modules.budget.entity.EntryType;
import com.imedba.modules.budget.mapper.BudgetEntryMapper;
import com.imedba.modules.budget.repository.BudgetAggregate;
import com.imedba.modules.budget.repository.BudgetEntryRepository;
import com.imedba.modules.budget.repository.BudgetEntrySpecs;
import com.imedba.modules.budget.repository.PeriodTotals;
import com.imedba.modules.contact.entity.Contact;
import com.imedba.modules.contact.repository.ContactRepository;
import com.imedba.modules.enrollment.entity.Enrollment;
import com.imedba.modules.enrollment.repository.EnrollmentRepository;
import com.imedba.modules.payment.entity.Payment;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
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
public class BudgetService {

    private final BudgetEntryRepository repository;
    private final BudgetEntryMapper mapper;
    private final ContactRepository contactRepository;
    private final EnrollmentRepository enrollmentRepository;

    public BudgetEntryResponse create(BudgetEntryCreateRequest req) {
        Contact contact = req.contactId() == null ? null
                : contactRepository.findById(req.contactId())
                        .orElseThrow(() -> NotFoundException.of("Contact", req.contactId()));
        Enrollment enrollment = req.enrollmentId() == null ? null
                : enrollmentRepository.findById(req.enrollmentId())
                        .orElseThrow(() -> NotFoundException.of("Enrollment", req.enrollmentId()));

        BudgetEntry entry = BudgetEntry.builder()
                .entryType(req.entryType())
                .category(req.category())
                .subcategory(req.subcategory())
                .businessUnit(req.businessUnit())
                .concept(req.concept())
                .amount(req.amount())
                .entryDate(req.entryDate())
                .periodMonth(req.entryDate().getMonthValue())
                .periodYear(req.entryDate().getYear())
                .paymentMethod(req.paymentMethod())
                .recurring(Boolean.TRUE.equals(req.recurring()))
                .cash(Boolean.TRUE.equals(req.cash()))
                .projected(Boolean.TRUE.equals(req.projected()))
                .referenceNumber(req.referenceNumber())
                .receiptFilePath(req.receiptFilePath())
                .contact(contact)
                .enrollment(enrollment)
                .notes(req.notes())
                .registeredBy(AuthUtils.currentUserId().orElse(null))
                .build();
        return mapper.toResponse(repository.save(entry));
    }

    @Transactional(readOnly = true)
    public BudgetEntryResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    @Transactional(readOnly = true)
    public Page<BudgetEntryResponse> list(EntryType type, BudgetCategory category,
                                          BusinessUnit businessUnit, UUID contactId,
                                          LocalDate from, LocalDate to, Boolean projected,
                                          Pageable pageable) {
        Specification<BudgetEntry> spec = Specification.where(BudgetEntrySpecs.byType(type))
                .and(BudgetEntrySpecs.byCategory(category))
                .and(BudgetEntrySpecs.byBusinessUnit(businessUnit))
                .and(BudgetEntrySpecs.byContact(contactId))
                .and(BudgetEntrySpecs.fromDate(from))
                .and(BudgetEntrySpecs.toDate(to))
                .and(BudgetEntrySpecs.projected(projected));
        return repository.findAll(spec, pageable).map(mapper::toResponse);
    }

    /**
     * Auto-link desde PaymentService: registra un INCOME al cerrar una cuota.
     * Idempotente por payment_id (UNIQUE index).
     */
    public void linkFromPayment(Payment payment) {
        if (payment == null || repository.existsByPaymentId(payment.getId())) {
            return;
        }
        LocalDate date = payment.getPaymentDate() == null
                ? LocalDate.now()
                : payment.getPaymentDate()
                        .atZone(java.time.ZoneId.of("America/Argentina/Buenos_Aires"))
                        .toLocalDate();
        BudgetEntry entry = BudgetEntry.builder()
                .entryType(EntryType.INCOME)
                .category(BudgetCategory.INCOME_ENROLLMENT)
                .subcategory("Cuota")
                .businessUnit(BusinessUnit.GENERAL)
                .concept("Pago cuota " + payment.getId())
                .amount(payment.getAmount())
                .entryDate(date)
                .periodMonth(date.getMonthValue())
                .periodYear(date.getYear())
                .paymentMethod(payment.getPaymentMethod())
                .payment(payment)
                .registeredBy(AuthUtils.currentUserId().orElse(null))
                .build();
        repository.save(entry);
    }

    /**
     * Auto-link desde BookSaleService: INCOME por venta de libros.
     * Idempotente por book_sale_id (UNIQUE index).
     */
    public void linkFromBookSale(BookSale sale) {
        if (sale == null || repository.existsByBookSaleId(sale.getId())) {
            return;
        }
        LocalDate date = sale.getSaleDate() == null
                ? LocalDate.now()
                : sale.getSaleDate().atZone(java.time.ZoneId.of("America/Argentina/Buenos_Aires"))
                        .toLocalDate();
        BudgetEntry entry = BudgetEntry.builder()
                .entryType(EntryType.INCOME)
                .category(BudgetCategory.INCOME_SALES)
                .subcategory("Venta libro")
                .businessUnit(BusinessUnit.EDITORIAL)
                .concept("Venta libro " + (sale.getBook() == null ? "" : sale.getBook().getName()))
                .amount(sale.getTotalAmount())
                .entryDate(date)
                .periodMonth(date.getMonthValue())
                .periodYear(date.getYear())
                .bookSale(sale)
                .registeredBy(sale.getSoldBy())
                .build();
        repository.save(entry);
    }

    @Transactional(readOnly = true)
    public BudgetSummaryResponse summary(int year, int month) {
        BigDecimal income = repository.sumByPeriod(EntryType.INCOME, false, year, month);
        BigDecimal expense = repository.sumByPeriod(EntryType.EXPENSE, false, year, month);
        BigDecimal projectedIncome = repository.sumByPeriod(EntryType.INCOME, true, year, month);
        BigDecimal projectedExpense = repository.sumByPeriod(EntryType.EXPENSE, true, year, month);
        return new BudgetSummaryResponse(
                year, month, income, expense, income.subtract(expense),
                projectedIncome, projectedExpense);
    }

    @Transactional(readOnly = true)
    public List<CategoryBreakdownResponse> breakdown(int year, int month) {
        List<CategoryBreakdownResponse> out = new ArrayList<>();
        for (BudgetAggregate a : repository.breakdown(EntryType.INCOME, year, month)) {
            out.add(new CategoryBreakdownResponse(
                    EntryType.INCOME, a.category(), a.businessUnit(), a.total()));
        }
        for (BudgetAggregate a : repository.breakdown(EntryType.EXPENSE, year, month)) {
            out.add(new CategoryBreakdownResponse(
                    EntryType.EXPENSE, a.category(), a.businessUnit(), a.total()));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<MonthlyFlowResponse> monthlyFlow(int year) {
        List<PeriodTotals> totals = repository.yearlyTotals(year, false);
        BigDecimal[] income = new BigDecimal[13];
        BigDecimal[] expense = new BigDecimal[13];
        for (int i = 1; i <= 12; i++) {
            income[i] = BigDecimal.ZERO;
            expense[i] = BigDecimal.ZERO;
        }
        for (PeriodTotals t : totals) {
            int m = t.month();
            if (t.entryType() == EntryType.INCOME) {
                income[m] = t.total();
            } else {
                expense[m] = t.total();
            }
        }
        List<MonthlyFlowResponse> out = new ArrayList<>(12);
        for (int i = 1; i <= 12; i++) {
            out.add(new MonthlyFlowResponse(year, i, income[i], expense[i],
                    income[i].subtract(expense[i])));
        }
        return out;
    }

    private BudgetEntry find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> NotFoundException.of("BudgetEntry", id));
    }
}
