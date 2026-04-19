# IMEDBA Backend

Spring Boot 3.3 + Java 21.

## Correr

### Dentro de Docker Compose (recomendado)

Desde la raíz del monorepo:

```bash
make up
```

### Standalone (contra Postgres + Keycloak dockerizados)

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Requiere que `make up` tenga al menos `db` y `keycloak` arriba.

## Estructura de paquetes

```
com.imedba
├── ImedbaApplication.java
├── config/               # SecurityConfig, CorsConfig, SendGridConfig, OpenApiConfig
├── common/               # BaseEntity, PageResponse, ApiError, GlobalExceptionHandler
├── modules/              # (se llenan por fase)
│   ├── student/
│   ├── course/
│   ├── enrollment/
│   └── ...
└── scheduler/            # Schedulers (cuotas, recordatorios)
```

Por módulo:

```
modules/<nombre>/
├── entity/
├── repository/
├── service/
├── controller/
└── dto/
```

## Migraciones

Flyway en `src/main/resources/db/migration/`:

- `V001__baseline.sql` → extensiones (`pgcrypto`), función `update_updated_at()`.
- `V002__xxx.sql` → en Fase 1 (students, courses, enrollments).

## Seguridad

Resource Server OAuth2 contra Keycloak (`imedba` realm). El `JwtAuthenticationConverter`
mapea:

- `realm_access.roles` → `ROLE_<nombre>` (usar `hasRole('ADMIN')` / `hasAnyRole(...)`).
- `resource_access.imedba-backend.roles` → authority plano (usar
  `hasAuthority('students:read')`).

## Tests

```bash
./mvnw test
```

Usa Testcontainers para levantar Postgres efímero. Incluye `spring-security-test` para
mockear JWTs en tests de controller.

## Health / OpenAPI

- Health: `GET /actuator/health`
- OpenAPI JSON: `GET /v3/api-docs`
- Swagger UI: `GET /swagger-ui.html`
