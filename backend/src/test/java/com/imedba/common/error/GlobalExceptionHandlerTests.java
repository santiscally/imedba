package com.imedba.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Fija el mapeo de los dos errores que caían en el catch-all y salían como
 * <b>500 «Error interno»</b> siendo culpa del llamador, no del servidor.
 */
class GlobalExceptionHandlerTests {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    private HttpServletRequest req(String uri) {
        MockHttpServletRequest r = new MockHttpServletRequest("GET", uri);
        r.setRequestURI(uri);
        return r;
    }

    @Test
    @DisplayName("Combinación de parámetros inválida → 400 con el mensaje que dice qué mandar")
    void bad_request_conserva_el_mensaje() {
        ResponseEntity<ApiError> res = handler.handleBadRequest(
                new BadRequestException("Indicá staffId, o year + month"),
                req("/api/v1/teaching/settlements"));

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().error()).isEqualTo("BAD_REQUEST");
        // El mensaje tiene que llegar al cliente: es lo único que le dice cómo arreglar la llamada.
        assertThat(res.getBody().message()).isEqualTo("Indicá staffId, o year + month");
    }

    @Test
    @DisplayName("Path que no matchea ningún controller → 404, no 500")
    void path_inexistente_es_404() {
        ResponseEntity<ApiError> res = handler.handleNoResource(
                new NoResourceFoundException(org.springframework.http.HttpMethod.GET, "api/v1/budget/summary"),
                req("/api/v1/budget/summary"));

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().error()).isEqualTo("NOT_FOUND");
        assertThat(res.getBody().message()).contains("/api/v1/budget/summary");
    }
}
