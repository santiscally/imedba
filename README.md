# IMEDBA — Sistema de Gestión Interna

Backoffice web para IMEDBA (instituto de educación médica). Reemplaza los múltiples Excel que usan hoy para
gestión académica, cobranza, editorial, formación superior, docentes, presupuesto y notificaciones.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Java 21 + Spring Boot 3.3.x |
| Frontend | React 18+ / TypeScript / Vite |
| Base de datos | PostgreSQL 16 |
| Autenticación | Keycloak 25 (OIDC/JWT) |
| Infra | Docker + Docker Compose |
| Email | SendGrid API v3 |
| LMS | Moodle (integración REST — fase futura) |
| Hosting | Don Web |

## Estructura del repo

```
imedba/
├── backend/              # Spring Boot 3 + Java 21 (Santi)
├── frontend/             # React 18 + TS + Vite (socio)
├── keycloak/             # Realm export + scripts de bootstrap
├── nginx/                # Reverse proxy (prod)
├── scripts/              # Utilidades de dev
├── docker-compose.yml    # Stack de dev
├── docker-compose.prod.yml  # Override de prod
├── .env.example          # Plantilla de variables de entorno
├── Makefile              # Comandos comunes
├── CLAUDE.md             # Instrucciones para Claude Code
└── instrucciones_claude/ # Documentación de diseño (arquitectura, ERD, fases, endpoints)
```

## Puesta en marcha (desarrollo)

### Requisitos

- Docker Desktop 24+ (o Docker Engine + Compose plugin).
- Java 21 y Maven 3.9+ solo si vas a correr el backend fuera de Docker.
- Node 20+ solo si vas a correr el frontend fuera de Docker.

### 1. Copiar `.env`

```bash
cp .env.example .env
```

Editar los valores (passwords, `SENDGRID_API_KEY`, etc.) antes de levantar.

### 2. Levantar el stack

```bash
make up
# equivale a: docker compose up -d --build
```

Servicios expuestos (defaults del `.env.example`):

| Servicio | URL local |
|----------|-----------|
| Backend (Spring Boot) | http://localhost:8080 |
| Actuator health | http://localhost:8080/actuator/health |
| Keycloak | http://localhost:8081 |
| PostgreSQL app | localhost:5432 |
| PostgreSQL Keycloak | localhost:5433 |

### 3. Verificar

```bash
make health   # cURL contra /actuator/health
make logs     # tail de todos los servicios
```

### 4. Bajar

```bash
make down       # detiene sin borrar volúmenes
make destroy    # baja + borra volúmenes (reset total)
```

## Keycloak

Al primer `docker compose up`, Keycloak importa el realm `imedba` desde `keycloak/realms/imedba-realm.json`.
Incluye:

- Clients: `imedba-frontend` (public, PKCE) e `imedba-backend` (confidential).
- Roles: `ADMIN`, `VENDEDORA`, `SECRETARIA_FS`, `EDITORIAL`, `CONTABLE`, `VIEWER`.
- Usuarios de prueba: ver `keycloak/README.md`.

> En dev, la consola de admin queda en http://localhost:8081 con `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` del `.env`.

## Backend

Ver `backend/README.md` para detalle de módulos, migraciones Flyway y tests.

## Frontend

Propiedad del socio. Ver `frontend/README.md`.

## Fases de desarrollo

Plan completo en `instrucciones_claude/04-plan-de-fases.md`. Estado actual: **Fase 0 (infra base)**.

## Licencia

Privado — IMEDBA.
