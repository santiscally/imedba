# Keycloak — realm `imedba`

Al levantar `docker compose up` con `--import-realm`, Keycloak toma el archivo
`realms/imedba-realm.json` y crea (si no existe) el realm completo:

- **Realm**: `imedba`
- **Clients**:
  - `imedba-frontend` — SPA React. Public (PKCE). `Standard Flow` habilitado, redirect URIs
    `http://localhost:5173/*` y `http://localhost:3000/*`. Web origins `+`.
  - `imedba-backend` — API Spring Boot. Confidential + Service Accounts habilitado.
    Es el **resource server** que valida el JWT. El `audience` del token incluye `imedba-backend`.
- **Realm roles**: `ADMIN`, `VENDEDORA`, `SECRETARIA_FS`, `EDITORIAL`, `CONTABLE`, `VIEWER`.
- **Client roles (permisos granulares)** sobre `imedba-backend`:
  `students:read/write`, `courses:read/write`, `enrollments:read/write`, `payments:read/write`,
  `editorial:read/write`, `stock:read/write`, `budget:read/write`, `teaching:read/write`,
  `settlements:read/write`, `notifications:manage`, `reports:read`, `admin:manage`.
- **Composite**: los realm roles incluyen los client roles correspondientes (ver tabla más abajo).
- **Usuarios de prueba** (password `test1234`):
  - `admin@imedba.dev` → `ADMIN`
  - `vendedora@imedba.dev` → `VENDEDORA`
  - `secretaria@imedba.dev` → `SECRETARIA_FS`
  - `editorial@imedba.dev` → `EDITORIAL`
  - `contable@imedba.dev` → `CONTABLE`
  - `viewer@imedba.dev` → `VIEWER`

> ⚠️ Cambiar passwords y regenerar el secret de `imedba-backend` antes de cualquier ambiente no local.

## Mapeo roles → permisos

| Rol | Permisos |
|-----|----------|
| `ADMIN` | Todos (`admin:manage` incluido). |
| `VENDEDORA` | `students:*`, `enrollments:*`, `courses:read`, `payments:*` (filtra por `enrolled_by`). |
| `SECRETARIA_FS` | `students:read`, `enrollments:read`, `settlements:*`, `teaching:read`, `notifications:manage`. |
| `EDITORIAL` | `editorial:*`, `stock:*`, `students:read`. |
| `CONTABLE` | `budget:*`, `reports:read`, `payments:read`. |
| `VIEWER` | Todos los `*:read`. |

## JWT que recibe el backend

- `iss`: `http://keycloak:8080/realms/imedba` (dentro de la red Docker) o
  `http://localhost:8081/realms/imedba` (desde la SPA en el host).
- `aud`: incluye `imedba-backend`.
- `realm_access.roles`: roles de realm (`ADMIN`, etc.).
- `resource_access.imedba-backend.roles`: client roles (permisos granulares).

En el backend, `JwtAuthenticationConverter` mapea ambos a `GrantedAuthority`:

- `ROLE_<realm-role>` → `hasRole('ADMIN')` / `hasAnyRole(...)`.
- `<permiso>` → `hasAuthority('students:read')`.

## Dev vs prod

- Dev: `start-dev` (HTTP, hostname relajado). Secret de client default.
- Prod: `start --optimized`, hostname fijo, TLS via nginx, secret rotado.
