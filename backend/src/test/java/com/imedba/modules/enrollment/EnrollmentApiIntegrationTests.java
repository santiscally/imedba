package com.imedba.modules.enrollment;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.course.entity.Course;
import com.imedba.modules.course.repository.CourseRepository;
import com.imedba.modules.enrollment.dto.EnrollmentCreateRequest;
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

class EnrollmentApiIntegrationTests extends AbstractIntegrationTest {

    private static final UUID ADMIN_SUB = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID SELLER_A_SUB = UUID.fromString("00000000-0000-0000-0000-00000000000a");
    private static final UUID SELLER_B_SUB = UUID.fromString("00000000-0000-0000-0000-00000000000b");

    @Autowired private StudentRepository studentRepository;
    @Autowired private CourseRepository courseRepository;

    private UUID studentId;
    private UUID courseId;

    @BeforeEach
    void clean() {
        truncateAll();
        Student s = Student.builder()
                .firstName("Ada").lastName("Lovelace").email("ada@imedba.dev")
                .active(Boolean.TRUE)
                .build();
        studentId = studentRepository.save(s).getId();

        Course c = Course.builder()
                .name("Residencia Cardio").code("RES-CARD")
                .businessUnit(BusinessUnit.RESIDENCIAS).modality("VIRTUAL")
                .enrollmentPrice(new BigDecimal("10000.00"))
                .coursePrice(new BigDecimal("50000.00"))
                .active(Boolean.TRUE)
                .build();
        courseId = courseRepository.save(c).getId();
    }

    @Test
    @DisplayName("POST /enrollments calcula final/total y setea enrolled_by = JWT sub")
    void create_computes_prices_and_sets_enrolled_by() throws Exception {
        var req = new EnrollmentCreateRequest(
                studentId, courseId, null, null,
                null, new BigDecimal("10"), new BigDecimal("2000"),
                null, 6, null, null, null);

        mockMvc.perform(post("/api/v1/enrollments")
                        .with(sellerA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.listPrice").value(60000.00))
                .andExpect(jsonPath("$.finalPrice").value(54000.00))
                .andExpect(jsonPath("$.totalPrice").value(56000.00))
                .andExpect(jsonPath("$.enrolledBy").value(SELLER_A_SUB.toString()))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("No permite dos inscripciones activas para el mismo alumno/curso → 409")
    void duplicate_active_enrollment_is_409() throws Exception {
        var req = new EnrollmentCreateRequest(
                studentId, courseId, null, null,
                null, null, null, null, null, null, null, null);

        mockMvc.perform(post("/api/v1/enrollments").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/enrollments").with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("suspend → reactivate → cancel funciona y respeta transiciones")
    void status_transitions() throws Exception {
        String id = createEnrollmentAs(admin());

        mockMvc.perform(put("/api/v1/enrollments/" + id + "/suspend").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"));

        // No se puede suspender dos veces
        mockMvc.perform(put("/api/v1/enrollments/" + id + "/suspend").with(admin()))
                .andExpect(status().isConflict());

        mockMvc.perform(put("/api/v1/enrollments/" + id + "/reactivate").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        mockMvc.perform(put("/api/v1/enrollments/" + id + "/cancel").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        // Cancelada no se puede volver a cancelar
        mockMvc.perform(put("/api/v1/enrollments/" + id + "/cancel").with(admin()))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Vendedora sólo ve sus propias inscripciones en GET /enrollments")
    void vendedora_sees_only_own() throws Exception {
        // Seller A crea una
        createEnrollmentAs(sellerA());

        // Seller B crea otra (requiere otro curso para esquivar unique)
        Course other = courseRepository.save(Course.builder()
                .name("Otra").code("OTRA-01")
                .businessUnit(BusinessUnit.OTROS).active(Boolean.TRUE)
                .enrollmentPrice(BigDecimal.ZERO).coursePrice(new BigDecimal("1000"))
                .build());
        var reqB = new EnrollmentCreateRequest(
                studentId, other.getId(), null, null,
                null, null, null, null, null, null, null, null);
        mockMvc.perform(post("/api/v1/enrollments").with(sellerB())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqB)))
                .andExpect(status().isCreated());

        // ADMIN ve 2
        mockMvc.perform(get("/api/v1/enrollments").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)));

        // Seller A ve solo la suya
        mockMvc.perform(get("/api/v1/enrollments").with(sellerA()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].enrolledBy").value(SELLER_A_SUB.toString()));

        // GET /my para seller B
        mockMvc.perform(get("/api/v1/enrollments/my").with(sellerB()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].enrolledBy").value(SELLER_B_SUB.toString()));
    }

    // --- helpers ---

    private String createEnrollmentAs(RequestPostProcessor who) throws Exception {
        var req = new EnrollmentCreateRequest(
                studentId, courseId, null, null,
                null, null, null, null, null, null, null, null);
        String body = mockMvc.perform(post("/api/v1/enrollments").with(who)
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
                        new SimpleGrantedAuthority("enrollments:write"));
    }

    private static RequestPostProcessor sellerA() {
        return jwt().jwt(j -> j.subject(SELLER_A_SUB.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_VENDEDORA"),
                        new SimpleGrantedAuthority("enrollments:read"),
                        new SimpleGrantedAuthority("enrollments:write"));
    }

    private static RequestPostProcessor sellerB() {
        return jwt().jwt(j -> j.subject(SELLER_B_SUB.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_VENDEDORA"),
                        new SimpleGrantedAuthority("enrollments:read"),
                        new SimpleGrantedAuthority("enrollments:write"));
    }
}
