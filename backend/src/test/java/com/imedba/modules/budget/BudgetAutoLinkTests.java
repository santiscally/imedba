package com.imedba.modules.budget;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.imedba.common.enums.PaymentMethod;
import com.imedba.modules.book.entity.Book;
import com.imedba.modules.booksale.entity.BookSale;
import com.imedba.modules.budget.entity.BudgetCategory;
import com.imedba.modules.budget.entity.BudgetEntry;
import com.imedba.modules.budget.entity.BusinessUnit;
import com.imedba.modules.budget.entity.EntryType;
import com.imedba.modules.budget.mapper.BudgetEntryMapper;
import com.imedba.modules.budget.repository.BudgetEntryRepository;
import com.imedba.modules.budget.service.BudgetService;
import com.imedba.modules.contact.repository.ContactRepository;
import com.imedba.modules.enrollment.repository.EnrollmentRepository;
import com.imedba.modules.payment.entity.Payment;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BudgetAutoLinkTests {

    @Mock private BudgetEntryRepository repository;
    @Mock private BudgetEntryMapper mapper;
    @Mock private ContactRepository contactRepository;
    @Mock private EnrollmentRepository enrollmentRepository;

    private BudgetService service;

    @BeforeEach
    void setUp() {
        service = new BudgetService(repository, mapper, contactRepository, enrollmentRepository);
        lenient().when(repository.save(any(BudgetEntry.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("linkFromPayment crea INCOME con categoría INCOME_ENROLLMENT")
    void link_from_payment_creates_income() {
        UUID paymentId = UUID.randomUUID();
        Payment p = Payment.builder()
                .amount(new BigDecimal("1500.00"))
                .paymentMethod(PaymentMethod.TRANSFERENCIA)
                .paymentDate(Instant.now())
                .build();
        p.setId(paymentId);
        when(repository.existsByPaymentId(paymentId)).thenReturn(false);

        service.linkFromPayment(p);

        ArgumentCaptor<BudgetEntry> cap = ArgumentCaptor.forClass(BudgetEntry.class);
        verify(repository).save(cap.capture());
        BudgetEntry saved = cap.getValue();
        assertThat(saved.getEntryType()).isEqualTo(EntryType.INCOME);
        assertThat(saved.getCategory()).isEqualTo(BudgetCategory.INCOME_ENROLLMENT);
        assertThat(saved.getAmount()).isEqualByComparingTo("1500.00");
        assertThat(saved.getPayment().getId()).isEqualTo(paymentId);
        assertThat(saved.getPaymentMethod()).isEqualTo(PaymentMethod.TRANSFERENCIA);
    }

    @Test
    @DisplayName("linkFromPayment es idempotente por payment_id")
    void link_from_payment_idempotent() {
        UUID paymentId = UUID.randomUUID();
        Payment p = Payment.builder().amount(BigDecimal.ONE).paymentDate(Instant.now()).build();
        p.setId(paymentId);
        when(repository.existsByPaymentId(paymentId)).thenReturn(true);

        service.linkFromPayment(p);

        verify(repository, never()).save(any(BudgetEntry.class));
    }

    @Test
    @DisplayName("linkFromBookSale crea INCOME con categoría INCOME_SALES + BU EDITORIAL")
    void link_from_book_sale_creates_income() {
        UUID saleId = UUID.randomUUID();
        Book book = Book.builder().build();
        book.setName("Anatomía");
        BookSale sale = BookSale.builder()
                .book(book)
                .totalAmount(new BigDecimal("250.00"))
                .saleDate(Instant.now())
                .build();
        sale.setId(saleId);
        when(repository.existsByBookSaleId(saleId)).thenReturn(false);

        service.linkFromBookSale(sale);

        ArgumentCaptor<BudgetEntry> cap = ArgumentCaptor.forClass(BudgetEntry.class);
        verify(repository).save(cap.capture());
        BudgetEntry saved = cap.getValue();
        assertThat(saved.getEntryType()).isEqualTo(EntryType.INCOME);
        assertThat(saved.getCategory()).isEqualTo(BudgetCategory.INCOME_SALES);
        assertThat(saved.getBusinessUnit()).isEqualTo(BusinessUnit.EDITORIAL);
        assertThat(saved.getAmount()).isEqualByComparingTo("250.00");
        assertThat(saved.getBookSale().getId()).isEqualTo(saleId);
        assertThat(saved.getConcept()).contains("Anatomía");
    }

    @Test
    @DisplayName("linkFromBookSale es idempotente por book_sale_id")
    void link_from_book_sale_idempotent() {
        UUID saleId = UUID.randomUUID();
        BookSale sale = BookSale.builder()
                .totalAmount(BigDecimal.ONE).saleDate(Instant.now()).build();
        sale.setId(saleId);
        when(repository.existsByBookSaleId(saleId)).thenReturn(true);

        service.linkFromBookSale(sale);

        verify(repository, never()).save(any(BudgetEntry.class));
    }
}
