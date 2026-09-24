package com.imedba.modules.course;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.imedba.modules.course.dto.CourseCreateRequest;
import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.modules.course.entity.CourseType;
import com.imedba.modules.course.entity.Modality;
import com.imedba.test.AbstractIntegrationTest;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class CourseApiIntegrationTests extends AbstractIntegrationTest {

    @BeforeEach
    void clean() {
        truncateAll();
    }

    @Test
    @DisplayName("POST /courses crea, filtro por active funciona")
    void create_and_filter_by_active() throws Exception {
        createCourse("Curso A", "RES-01", true);
        createCourse("Curso C", "RES-02", false);

        mockMvc.perform(get("/api/v1/courses").param("businessUnit", "RESIDENCIAS").with(reader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)));

        mockMvc.perform(get("/api/v1/courses")
                        .param("businessUnit", "RESIDENCIAS").param("active", "true").with(reader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].code").value("RES-01"));
    }

    @Test
    @DisplayName("POST /courses con code duplicado → 409")
    void duplicate_code_is_409() throws Exception {
        createCourse("X", "DUP-01", true);
        mockMvc.perform(post("/api/v1/courses").with(writer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                request("Y", "DUP-01", BusinessUnit.RESIDENCIAS, START, END))))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("POST /courses de Formación Superior o General → 400 (FS se crea como comisión)")
    void non_residencias_is_400() throws Exception {
        for (BusinessUnit bu : new BusinessUnit[] {BusinessUnit.FORMACION_SUPERIOR, BusinessUnit.GENERAL}) {
            mockMvc.perform(post("/api/v1/courses").with(writer())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request("Z", null, bu, START, END))))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    @DisplayName("POST /courses guarda inicio/cierre y rechaza cierre anterior al inicio")
    void course_dates() throws Exception {
        mockMvc.perform(post("/api/v1/courses").with(writer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request("Con fechas", null,
                                BusinessUnit.RESIDENCIAS, LocalDate.of(2027, 3, 1), LocalDate.of(2027, 12, 15)))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.startDate").value("2027-03-01"))
                .andExpect(jsonPath("$.endDate").value("2027-12-15"));

        mockMvc.perform(post("/api/v1/courses").with(writer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request("Al revés", null,
                                BusinessUnit.RESIDENCIAS, LocalDate.of(2027, 12, 15), LocalDate.of(2027, 3, 1)))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/courses").with(writer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request("Sin fechas", null,
                                BusinessUnit.RESIDENCIAS, null, null))))
                .andExpect(status().isBadRequest());
    }

    private static final LocalDate START = LocalDate.of(2027, 3, 1);
    private static final LocalDate END = LocalDate.of(2027, 12, 15);

    private void createCourse(String name, String code, boolean active) throws Exception {
        var req = new CourseCreateRequest(
                name, code, null, BusinessUnit.RESIDENCIAS, CourseType.NORMAL, Modality.LIBRE, "AR",
                new BigDecimal("10000.00"), new BigDecimal("50000.00"),
                null, START, END, null, null, null, null, false, active);
        mockMvc.perform(post("/api/v1/courses").with(writer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    private static CourseCreateRequest request(String name, String code, BusinessUnit bu,
                                               LocalDate start, LocalDate end) {
        return new CourseCreateRequest(
                name, code, null, bu, null, null, "AR",
                BigDecimal.ZERO, BigDecimal.ZERO, null, start, end, null, null, null, null, false, true);
    }

    private static RequestPostProcessor writer() {
        return jwt().jwt(j -> j.subject("00000000-0000-0000-0000-000000000001"))
                .authorities(new SimpleGrantedAuthority("courses:read"),
                        new SimpleGrantedAuthority("courses:write"),
                        new SimpleGrantedAuthority("residencias:read"));
    }

    private static RequestPostProcessor reader() {
        return jwt().jwt(j -> j.subject("00000000-0000-0000-0000-000000000001"))
                .authorities(new SimpleGrantedAuthority("courses:read"),
                        new SimpleGrantedAuthority("residencias:read"));
    }
}
