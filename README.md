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

### 4. Base de datos en el deploy: arreglos y diagnóstico

Los arreglos de datos **no se corren a mano**: van como migraciones Flyway
`V0NN__fix_<qué>.sql` y se ejecutan solos al arrancar el backend, una única vez y en
transacción. Si uno falla, el backend no arranca y la base queda como estaba. Lo que
necesita una decisión de negocio no se arregla solo: aparece en el diagnóstico para
resolverlo a mano.

Orden en cada deploy:

```bash
PROD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

# 1) Backup (obligatorio antes de cualquier migración)
./scripts/backup-db.sh

# 2) Diagnóstico ANTES (sólo lectura): guardar la salida para comparar
$PROD exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < scripts/sql/diagnostico-deploy.sql > diagnostico-antes.txt

# 3) Deploy: al arrancar, el backend aplica las migraciones pendientes (incluidos los arreglos)
$PROD up -d --build
$PROD logs backend | grep -E "Migrating schema|Successfully applied|FAILED"

# 4) Diagnóstico DESPUÉS: comparar con el de antes
$PROD exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < scripts/sql/diagnostico-deploy.sql > diagnostico-despues.txt
```

Reglas para escribir un arreglo:

- Nunca `DELETE` físico ni borrar columnas con datos; no tocar montos, pagos ni cuotas.
- **Derivar, no inventar**: sólo se completa un dato si sale de otro que ya está en la base.
- Que no rompa si no hay nada que arreglar (corre igual en prod, demo y local).
- Probarlo antes contra una copia con `BEGIN; … ROLLBACK;`.
- Si hace falta decidir algo, no va automático: se agrega una consulta al diagnóstico.

Arreglos de datos incluidos hasta hoy:

| Migración | Qué arregla |
|---|---|
| `V044` | Cada diplomatura vieja pasa a tener su curso espejo como primera comisión. |
| `V046` | Unidad de alta de los alumnos existentes: Formación Superior si sólo tienen inscripciones en FS, si no Residencias. |
| `V047` | Cursos FS sin diplomatura: se cuelgan de la diplomatura de su programa (sacando el "— Comisión N" del nombre; la crea si no existe) y se completa el número de comisión cuando el nombre lo trae. |

Qué mirar en `scripts/sql/diagnostico-deploy.sql` después del deploy: la sección 1
tiene que dar vacía; las secciones 2 a 6 son pendientes a resolver a mano (comisiones sin
número, diplomaturas duplicadas, cursos de Editorial/General, cursos sin fechas, libros
de colección con precio 0).

## Fases de desarrollo

Plan completo en `instrucciones_claude/04-plan-de-fases.md`. Estado actual: **Fase 0 (infra base)**.

## Licencia

Privado — IMEDBA.
