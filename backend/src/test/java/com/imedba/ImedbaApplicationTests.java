package com.imedba;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Smoke test: arranca el contexto de Spring contra un Postgres efímero de Testcontainers
 * y valida que corran las migraciones Flyway.
 *
 * Stubea el issuer del Resource Server con una URL dummy — no hacemos llamadas HTTP
 * porque ningún test lee el JWK en esta fase.
 */
@Testcontainers
@SpringBootTest
@ActiveProfiles("dev")
class ImedbaApplicationTests {

    @Container
    @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("imedba")
            .withUsername("imedba")
            .withPassword("imedba_test");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri",
                () -> "http://localhost:0/realms/imedba");
        registry.add("spring.security.oauth2.resourceserver.jwt.jwk-set-uri",
                () -> "http://localhost:0/realms/imedba/protocol/openid-connect/certs");
    }

    @Test
    void contextLoads() {
        assertThat(postgres.isRunning()).isTrue();
    }
}
