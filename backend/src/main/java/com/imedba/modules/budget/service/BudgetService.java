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
import com.imedba.modules.enrollment.entity.InstallmentDistribution;
import com.imedba.modules.enrollment.repository.EnrollmentRepository;
import com.imedba.modules.payment.entity.Payment;
import java.math.BigDecimal;
import java.math.RoundingMode;
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
                .registeredBy(AuthUtils.requireCurrentUserId())
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

        // Reunión 2026-05-22 §2.7: enriquecer subcategoría + concept con datos legibles.
        Enrollment e = payment.getEnrollment();
        String courseName = (e != null && e.getCourse() != null) ? e.getCourse().getName() : null;
        BusinessUnit bu = mapBusinessUnit(
                (e != null && e.getCourse() != null) ? e.getCourse().getBusinessUnit() : null);
        String studentName = (e != null && e.getStudent() != null)
                ? formatStudentName(e.getStudent().getLastName(), e.getStudent().getFirstName())
                : null;
        Integer installmentNumber = payment.getInstallment() != null
                ? payment.getInstallment().getNumber()
                : null;
        // Total cobrado = amount + lateFeeAmount (V017). Sumamos a la entrada de presupuesto.
        BigDecimal total = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
        if (payment.getLateFeeAmount() != null) {
            total = total.add(payment.getLateFeeAmount());
        }

        // Docx Jaque 2026-07-20 §Presupuesto: cuando la cuota incluye libros
        // (distributionMode=TOTAL con bookPrice>0), separar el cobro en 2 asientos:
        // uno de INCOME_ENROLLMENT (curso+matrícula) y otro de INCOME_SALES (libros),
        // proporcional al peso relativo. El late fee siempre va a INCOME_ENROLLMENT.
        BigDecimal bookShare = bookShareOf(e);
        BigDecimal principalTotal = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
        boolean splitByBooks = bookShare.signum() > 0 && principalTotal.signum() > 0;

        List<BudgetEntry> toSave = new ArrayList<>(2);

        if (splitByBooks) {
            BigDecimal bookAmount = principalTotal.multiply(bookShare)
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal courseAmount = principalTotal.subtract(bookAmount);
            // late fee → siempre al asiento de curso (no aplica a los libros).
            if (payment.getLateFeeAmount() != null) {
                courseAmount = courseAmount.add(payment.getLateFeeAmount());
            }

            toSave.add(BudgetEntry.builder()
                    .entryType(EntryType.INCOME)
                    .category(BudgetCategory.INCOME_ENROLLMENT)
                    .subcategory(courseName != null ? courseName : "Cuota")
                    .businessUnit(bu)
                    .concept(buildPaymentConcept(installmentNumber, studentName))
                    .amount(courseAmount)
                    .entryDate(date)
                    .periodMonth(date.getMonthValue())
                    .periodYear(date.getYear())
                    .paymentMethod(payment.getPaymentMethod())
                    .payment(payment)
                    .registeredBy(AuthUtils.requireCurrentUserId())
                    .build());
            toSave.add(BudgetEntry.builder()
                    .entryType(EntryType.INCOME)
                    .category(BudgetCategory.INCOME_SALES)
                    .subcategory("Libros" + (courseName != null ? " — " + courseName : ""))
                    .businessUnit(bu)
                    .concept(buildBookShareConcept(installmentNumber, studentName))
                    .amount(bookAmount)
                    .entryDate(date)
                    .periodMonth(date.getMonthValue())
                    .periodYear(date.getYear())
                    .paymentMethod(payment.getPaymentMethod())
                    .payment(payment)
                    .registeredBy(AuthUtils.requireCurrentUserId())
                    .build());
        } else {
            toSave.add(BudgetEntry.builder()
                    .entryType(EntryType.INCOME)
                    .category(BudgetCategory.INCOME_ENROLLMENT)
                    .subcategory(courseName != null ? courseName : "Cuota")
                    .businessUnit(bu)
                    .concept(buildPaymentConcept(installmentNumber, studentName))
                    .amount(total)
                    .entryDate(date)
                    .periodMonth(date.getMonthValue())
                    .periodYear(date.getYear())
                    .paymentMethod(payment.getPaymentMethod())
                    .payment(payment)
                    .registeredBy(AuthUtils.requireCurrentUserId())
                    .build());
        }

        repository.saveAll(toSave);
    }

    /**
     * Proporción del pago que corresponde a libros vs curso+matrícula.
     * Sólo aplica cuando el modo de distribución fue TOTAL (los libros
     * viajaron dentro de las cuotas) y hay bookPrice > 0. En SEPARATE y
     * COURSE_AND_FEE los libros van por book_sales y el pago no incluye
     * su parte → devuelve 0.
     */
    private static BigDecimal bookShareOf(Enrollment e) {
        if (e == null || e.getDistributionMode() != InstallmentDistribution.TOTAL) {
            return BigDecimal.ZERO;
        }
        BigDecimal bookPrice = e.getBookPrice() != null ? e.getBookPrice() : BigDecimal.ZERO;
        if (bookPrice.signum() <= 0) return BigDecimal.ZERO;

        BigDecimal finalPrice = e.getFinalPrice() != null ? e.getFinalPrice() : BigDecimal.ZERO;
        BigDecimal fee        = e.getEnrollmentFee() != null ? e.getEnrollmentFee() : BigDecimal.ZERO;
        BigDecimal denom      = finalPrice.add(fee).add(bookPrice);
        if (denom.signum() <= 0) return BigDecimal.ZERO;
        return bookPrice.divide(denom, 6, RoundingMode.HALF_UP);
    }

    private static String buildBookShareConcept(Integer installmentNumber, String studentName) {
        StringBuilder sb = new StringBuilder("Libros (parte cuota");
        if (installmentNumber != null && installmentNumber > 0) {
            sb.append(" ").append(installmentNumber);
        }
        sb.append(")");
        if (studentName != null) sb.append(" — ").append(studentName);
        return sb.toString();
    }

    private static String buildPaymentConcept(Integer installmentNumber, String studentName) {
        StringBuilder sb = new StringBuilder();
        if (installmentNumber == null) {
            sb.append("Pago");
        } else if (installmentNumber == 0) {
            sb.append("Pago matrícula");
        } else {
            sb.append("Pago cuota ").append(installmentNumber);
        }
        if (studentName != null) {
            sb.append(" — ").append(studentName);
        }
        return sb.toString();
    }

    private static String formatStudentName(String lastName, String firstName) {
        boolean hasLast = lastName != null && !lastName.isBlank();
        boolean hasFirst = firstName != null && !firstName.isBlank();
        if (hasLast && hasFirst) return lastName + " " + firstName;
        if (hasLast) return lastName;
        if (hasFirst) return firstName;
        return null;
    }

    /** Mapea el {@code BusinessUnit} de course al del módulo budget (mismos valores, enum distinto). */
    private static BusinessUnit mapBusinessUnit(com.imedba.modules.course.entity.BusinessUnit src) {
        if (src == null) return BusinessUnit.GENERAL;
        try {
            return BusinessUnit.valueOf(src.name());
        } catch (IllegalArgumentException ex) {
            return BusinessUnit.GENERAL;
        }
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
        // Reunión 2026-05-22 §2.7: subcategory = nombre del libro; concept con comprador.
        String bookName = sale.getBook() != null ? sale.getBook().getName() : null;
        String buyer = sale.getStudent() != null
                ? formatStudentName(sale.getStudent().getLastName(), sale.getStudent().getFirstName())
                : null;
        String concept = buyer != null
                ? "Venta libro — " + buyer
                : (bookName != null ? "Venta libro: " + bookName : "Venta libro");

        BudgetEntry entry = BudgetEntry.builder()
                .entryType(EntryType.INCOME)
                .category(BudgetCategory.INCOME_SALES)
                .subcategory(bookName != null ? bookName : "Venta libro")
                .businessUnit(BusinessUnit.EDITORIAL)
                .concept(concept)
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
