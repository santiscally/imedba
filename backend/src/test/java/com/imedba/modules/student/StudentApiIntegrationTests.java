package com.imedba.modules.student;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.imedba.modules.student.dto.StudentCreateRequest;
import com.imedba.modules.student.dto.StudentUpdateRequest;
import com.imedba.test.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

class StudentApiIntegrationTests extends AbstractIntegrationTest {

    @BeforeEach
    void clean() {
        truncateAll();
    }

    @Test
    @DisplayName("POST /students → 201 y GET /students lo encuentra")
    void create_and_list() throws Exception {
        var req = new StudentCreateRequest(
                "Ada", "Lovelace", "ada@imedba.dev",
                null, "12345678", null, null, null, null, null);

        mockMvc.perform(post("/api/v1/students")
                        .with(writer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("ada@imedba.dev"))
                .andExpect(jsonPath("$.active").value(true));

        mockMvc.perform(get("/api/v1/students").with(reader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].firstName").value("Ada"));
    }

    @Test
    @DisplayName("POST /students duplicate email → 409")
    void duplicate_email_is_409() throws Exception {
        var req = new StudentCreateRequest(
                "Ada", "Lovelace", "dup@imedba.dev",
                null, null, null, null, null, null, null);
        mockMvc.perform(post("/api/v1/students").with(writer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/students").with(writer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("PUT /students/{id} actualiza campos")
    void update_changes_fields() throws Exception {
        var create = new StudentCreateRequest(
                "Grace", "Hopper", "grace@imedba.dev",
                null, null, null, null, null, null, null);
        String id = createStudentAndGetId(create);

        var upd = new StudentUpdateRequest(
                "Grace", "Hopper", "grace@imedba.dev",
                "+54911", null, "Argentina", null, null, true, "VIP");
        mockMvc.perform(put("/api/v1/students/" + id).with(writer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(upd)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("+54911"))
                .andExpect(jsonPath("$.nationality").value("Argentina"))
                .andExpect(jsonPath("$.notes").value("VIP"));
    }

    @Test
    @DisplayName("DELETE es soft delete: deja de aparecer en listado")
    void delete_is_soft() throws Exception {
        var req = new StudentCreateRequest(
                "Alan", "Turing", "alan@imedba.dev",
                null, null, null, null, null, null, null);
        String id = createStudentAndGetId(req);

        mockMvc.perform(delete("/api/v1/students/" + id).with(writer()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/students").with(reader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    @DisplayName("GET sin authority → 403")
    void missing_authority_is_403() throws Exception {
        mockMvc.perform(get("/api/v1/students")
                        .with(jwt().jwt(j -> j.subject("00000000-0000-0000-0000-000000000099"))))
                .andExpect(status().isForbidden());
    }

    // --- helpers ---

    private String createStudentAndGetId(StudentCreateRequest req) throws Exception {
        String json = mockMvc.perform(post("/api/v1/students").with(writer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(json).get("id").asText();
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor writer() {
        return jwt().jwt(j -> j.subject("00000000-0000-0000-0000-000000000001"))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"),
                        new SimpleGrantedAuthority("students:read"),
                        new SimpleGrantedAuthority("students:write"));
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor reader() {
        return jwt().jwt(j -> j.subject("00000000-0000-0000-0000-000000000001"))
                .authorities(new SimpleGrantedAuthority("students:read"));
    }
}
