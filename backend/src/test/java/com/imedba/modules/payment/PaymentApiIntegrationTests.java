package com.imedba.modules.payment;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.imedba.common.enums.PaymentMethod;
import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.course.entity.Course;
import com.imedba.modules.course.repository.CourseRepository;
import com.imedba.modules.enrollment.dto.EnrollmentCreateRequest;
import com.imedba.modules.payment.dto.PaymentCreateRequest;
import com.imedba.modules.student.entity.Student;
import com.imedba.modules.student.repository.StudentRepository;
import com.imedba.test.AbstractIntegrationTest;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class PaymentApiIntegrationTests extends AbstractIntegrationTest {

    private static final UUID ADMIN_SUB = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Autowired private StudentRepository studentRepository;
    @Autowired private CourseRepository courseRepository;

    private UUID studentId;
    private UUID courseId;

    @BeforeEach
    void setUp() {
        truncateAll();
        studentId = studentRepository.save(Student.builder()
                .firstName("Grace").lastName("Hopper").email("grace@imedba.dev")
                .active(Boolean.TRUE).build()).getId();
        courseId = courseRepository.save(Course.builder()
                .name("Curso Cobranza").code("COB-01")
                .businessUnit(BusinessUnit.RESIDENCIAS).modality("VIRTUAL")
                .enrollmentPrice(new BigDecimal("10000.00"))
                .coursePrice(new BigDecimal("50000.00"))
                .active(Boolean.TRUE).build()).getId();
    }

    @Test
    @DisplayName("Crear enrollment genera automáticamente cuota 0 + N cuotas mensuales")
    void enrollment_creation_generates_installments() throws Exception {
        String enrollmentId = createEnrollment();

        mockMvc.perform(get("/api/v1/installments/by-enrollment/" + enrollmentId).with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(7))) // 1 matrícula + 6 cuotas
                .andExpect(jsonPath("$[0].number").value(0))
                .andExpect(jsonPath("$[6].number").value(6));
    }

    @Test
    @DisplayName("Registrar pago que cubre totalDue marca la cuota PAID y genera receipt_number")
    void register_payment_closes_installment() throws Exception {
        String enrollmentId = createEnrollment();

        // Busco la cuota 0 (matrícula) para este enrollment
        String byEnrollment = mockMvc.perform(
                get("/api/v1/installments/by-enrollment/" + enrollmentId).with(admin()))
                .andReturn().getResponse().getContentAsString();
        JsonNode feeInst = objectMapper.readTree(byEnrollment).get(0);
        String installmentId = feeInst.get("id").asText();
        BigDecimal totalDue = new BigDecimal(feeInst.get("totalDue").asText());

        var req = new PaymentCreateRequest(
                UUID.fromString(installmentId), null,
                totalDue, PaymentMethod.TRANSFERENCIA,
                null, "OP-12345", null, "primer pago");

        mockMvc.perform(post("/api/v1/payments").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount").value(greaterThan(0)))
                .andExpect(jsonPath("$.receiptNumber")
                        .value(matchesPattern("IMD-\\d{8}-\\d{6}")));

        // La cuota ahora está PAID
        mockMvc.perform(get("/api/v1/installments/" + installmentId).with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.paidAt").exists());
    }

    @Test
    @DisplayName("Pago con installmentId inexistente → 404")
    void payment_with_unknown_installment_is_404() throws Exception {
        var req = new PaymentCreateRequest(
                UUID.randomUUID(), null,
                new BigDecimal("100"), PaymentMethod.EFECTIVO,
                null, null, null, null);
        mockMvc.perform(post("/api/v1/payments").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Pago sin installmentId ni enrollmentId → 409")
    void payment_without_target_is_409() throws Exception {
        var req = new PaymentCreateRequest(
                null, null,
                new BigDecimal("100"), PaymentMethod.EFECTIVO,
                null, null, null, null);
        mockMvc.perform(post("/api/v1/payments").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    // --- helpers ---

    private String createEnrollment() throws Exception {
        var req = new EnrollmentCreateRequest(
                studentId, courseId, null, null,
                null, null, null,
                new BigDecimal("10000.00"), 6, PaymentMethod.TRANSFERENCIA,
                null, null);
        String body = mockMvc.perform(post("/api/v1/enrollments").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("id").asText();
    }

    private static RequestPostProcessor admin() {
        return jwt().jwt(j -> j.subject(ADMIN_SUB.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"),
                        new SimpleGrantedAuthority("enrollments:read"),
                        new SimpleGrantedAuthority("enrollments:write"),
                        new SimpleGrantedAuthority("installments:read"),
                        new SimpleGrantedAuthority("installments:write"),
                        new SimpleGrantedAuthority("payments:read"),
                        new SimpleGrantedAuthority("payments:write"));
    }
}
