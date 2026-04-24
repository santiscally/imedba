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
├── backend/                # Spring Boot 3 + Java 21 (Santi)
├── frontend/               # React 18 + TS + Vite (Fran)
├── keycloak/               # Realm export + scripts de bootstrap
├── db/init/                # Init SQL/SH para Postgres (crea DB keycloak)
├── nginx/                  # Reverse proxy TLS (prod) — templates + certs
├── docker-compose.yml      # Stack dev completo (una Postgres, ambas DBs)
├── docker-compose.prod.yml # Override prod — agrega nginx TLS 80/443
├── .env.example            # Plantilla de variables de entorno
├── CLAUDE.md               # Instrucciones para Claude Code
└── instrucciones_claude/   # Documentación de diseño (arquitectura, ERD, fases, endpoints)
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
docker compose up -d --build
```

Servicios expuestos en dev (bindeados a `127.0.0.1` para no exponer fuera del host):

| Servicio | URL local |
|----------|-----------|
| Frontend (SPA) | http://localhost:5173 |
| Backend (Spring Boot) | http://localhost:8080 |
| Actuator health | http://localhost:8080/actuator/health |
| Keycloak | http://localhost:8081 |
| PostgreSQL | localhost:5432 (DBs: `imedba`, `keycloak`) |

### 3. Verificar

```bash
curl http://localhost:8080/actuator/health   # backend
docker compose logs -f --tail=200            # tail de todos los servicios
```

### 4. Bajar

```bash
docker compose down        # detiene sin borrar volúmenes
docker compose down -v     # baja + borra volúmenes (reset total)
```

> Si cambiás el init script de Postgres (`db/init/*.sh`), necesitás borrar el volumen
> (`down -v`) para que vuelva a correr — el init solo se ejecuta en el primer boot.

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

Propiedad del Fran. Ver `frontend/README.md`.

## Puesta en marcha (producción)

El stack de producción agrega un nginx como reverse proxy TLS en 80/443.
Solo nginx expone puertos públicos; el resto de los servicios quedan en la red interna.

```
browser → https://${SERVER_NAME}/            → nginx → frontend:80 (SPA)
browser → https://${SERVER_NAME}/api/*       → nginx → backend:8080
browser → https://${SERVER_NAME}/auth/*      → nginx → keycloak:8080 (KC_HTTP_RELATIVE_PATH=/auth)
```

### 1. Variables de entorno

En el `.env` (ver `.env.example`) setear como mínimo:

- `SERVER_NAME` — dominio público (ej. `app.imedba.com.ar`).
- `KEYCLOAK_HOSTNAME` — mismo dominio que `SERVER_NAME`.
- `KEYCLOAK_ISSUER_URI` — `https://${SERVER_NAME}/auth/realms/imedba`.
- `KEYCLOAK_JWK_SET_URI` — `http://keycloak:8080/auth/realms/imedba/protocol/openid-connect/certs` (red interna).
- Passwords reales (no los `*_change_me`).

### 2. Certificados TLS

Colocar en `./nginx/certs/`:

- `fullchain.pem`
- `privkey.pem`

Detalle (Let's Encrypt vía certbot, auto-firmado para staging, etc.) en `nginx/README.md`.

Para staging rápido con cert auto-firmado:

```bash
mkdir -p nginx/certs
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout nginx/certs/privkey.pem \
  -out    nginx/certs/fullchain.pem \
  -subj "/CN=staging.example.com"
```

### 3. Levantar

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f --tail=200

# Recargar config de nginx sin downtime
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Fases de desarrollo

Plan completo en `instrucciones_claude/04-plan-de-fases.md`. Estado actual: **Fase 0 (infra base)**.

## Licencia

Privado — IMEDBA.
