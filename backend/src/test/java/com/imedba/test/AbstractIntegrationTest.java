package com.imedba.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base para tests de integración. El contenedor Postgres es un singleton JVM
 * (sin {@code @Container}) para reutilizarlo entre clases — cada clase crea su
 * propio contexto Spring, pero todas apuntan a la misma instancia de DB. La
 * limpieza entre tests la hace {@link #truncateAll()} en cada subclase.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
public abstract class AbstractIntegrationTest {

    @SuppressWarnings("resource")
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("imedba_test")
                    .withUsername("imedba")
                    .withPassword("imedba_test")
                    .withReuse(true);

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void registerDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;
    @Autowired protected JdbcTemplate jdbc;

    /** Trunca todas las tablas del dominio (fases 1-2), respetando FKs. */
    protected void truncateAll() {
        jdbc.execute("""
                TRUNCATE TABLE payments, installments, enrollments,
                               discount_campaigns, courses, students
                RESTART IDENTITY CASCADE
                """);
    }
}
