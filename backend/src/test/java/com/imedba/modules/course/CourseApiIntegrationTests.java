package com.imedba.modules.course;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.imedba.modules.course.dto.CourseCreateRequest;
import com.imedba.modules.course.entity.BusinessUnit;
import com.imedba.test.AbstractIntegrationTest;
import java.math.BigDecimal;
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
    @DisplayName("POST /courses crea, filtro por businessUnit funciona")
    void create_and_filter_by_business_unit() throws Exception {
        createCourse("Curso A", "RES-01", BusinessUnit.RESIDENCIAS, true);
        createCourse("Curso B", "PRE-01", BusinessUnit.PREMATUROS, true);
        createCourse("Curso C", "RES-02", BusinessUnit.RESIDENCIAS, false);

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
        createCourse("X", "DUP-01", BusinessUnit.OTROS, true);
        var dup = new CourseCreateRequest(
                "Y", "DUP-01", null, BusinessUnit.OTROS, null,
                BigDecimal.ZERO, BigDecimal.ZERO, null, null, null, true);
        mockMvc.perform(post("/api/v1/courses").with(writer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dup)))
                .andExpect(status().isConflict());
    }

    private void createCourse(String name, String code, BusinessUnit bu, boolean active) throws Exception {
        var req = new CourseCreateRequest(
                name, code, null, bu, "VIRTUAL",
                new BigDecimal("10000.00"), new BigDecimal("50000.00"),
                null, null, null, active);
        mockMvc.perform(post("/api/v1/courses").with(writer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    private static RequestPostProcessor writer() {
        return jwt().jwt(j -> j.subject("00000000-0000-0000-0000-000000000001"))
                .authorities(new SimpleGrantedAuthority("courses:read"),
                        new SimpleGrantedAuthority("courses:write"));
    }

    private static RequestPostProcessor reader() {
        return jwt().jwt(j -> j.subject("00000000-0000-0000-0000-000000000001"))
                .authorities(new SimpleGrantedAuthority("courses:read"));
    }
}
