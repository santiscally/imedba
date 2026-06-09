# Módulo Personal — Gestión de usuarios (Keycloak Admin API)

> Estado: **MVP funcional en dev.** Alta/edición/baja de usuarios + blanqueo de contraseña + rol.
> Pendientes (al final) antes de prod. Reunión origen: pedido del usuario 2026-06-09.

## Qué es

La pestaña **Personal** (menú Administración) es donde el **ADMIN** da de alta los usuarios del
sistema con su **contraseña** y su **rol**. Los usuarios **no viven en la base de la app**: viven
en **Keycloak** (realm `imedba`). El backend los administra vía el **Keycloak Admin REST API**.

Acceso: **solo ADMIN**. La ruta `/personal` está gateada por la authority `admin:manage`
(exclusiva de ADMIN) en `frontend/src/lib/access.ts`, y el controller backend exige lo mismo
(`@PreAuthorize("hasAuthority('admin:manage')")`).

## Arquitectura

```
Front /personal (solo admin)
  └─ api/users.ts ──HTTP──> UserAdminController (/api/v1/users, admin:manage)
                                └─ UserAdminService ──> KeycloakAdminClient
                                                          └─ Keycloak Admin REST API
                                                             (token admin del realm `master`)
```

Backend (`modules/useradmin/`):
- `config/KeycloakAdminProperties` — `@ConfigurationProperties("keycloak.admin")`.
- `client/KeycloakAdminClient` — saca token de admin (grant `password` contra realm `master`,
  cliente `admin-cli`) y opera sobre `/admin/realms/imedba/users`. No cachea token (se pide uno
  por operación; suficiente para el volumen de IMEDBA).
- `service/UserAdminService` — orquesta; si `keycloak.admin.enabled=false` devuelve 409 explicativo.
- `controller/UserAdminController` — `GET /users`, `GET /users/roles`, `POST /users`,
  `PUT /users/{id}`, `PUT /users/{id}/reset-password`, `DELETE /users/{id}`.
- `dto/` — `AppUserResponse`, `CreateUserRequest`, `UpdateUserRequest`, `ResetPasswordRequest`.

Front:
- `api/users.ts`, `types/user.ts`, `pages/Personal.tsx` (tabla + modal de alta + acciones de fila:
  blanquear contraseña, activar/desactivar, eliminar).

Roles de app (constante `KeycloakAdminClient.APP_ROLES`, espeja los roles de realm):
`ADMIN, VENDEDORA, SECRETARIA_FS, EDITORIAL, CONTABLE, VIEWER`.

## Config (env vars)

Definidas en `application.yml` (`keycloak.admin.*`) y pasadas al contenedor en `docker-compose.yml`:

| Var | Default dev | Qué es |
|-----|-------------|--------|
| `USER_ADMIN_ENABLED` | `true` | feature flag del módulo |
| `KEYCLOAK_ADMIN_BASE_URL` | `http://keycloak:8080` | Keycloak en la red interna docker |
| `KEYCLOAK_REALM` | `imedba` | realm donde viven los usuarios de la app |
| `KEYCLOAK_ADMIN_REALM` | `master` | realm contra el que autenticamos al admin |
| `KEYCLOAK_ADMIN_CLIENT_ID` | `admin-cli` | client del grant de admin |
| `KEYCLOAK_ADMIN` | `admin` | usuario admin |
| `KEYCLOAK_ADMIN_PASSWORD` | `admin` | password admin |

**En dev anda out-of-the-box**: usa el admin `admin/admin` del compose (realm `master`,
`admin-cli`), sin tocar service-account roles. No hace falta `down -v`.

## Cómo se usa (demo)

1. Loguearse como `admin@imedba.dev`.
2. Menú **Administración → Personal**.
3. **Nuevo usuario**: nombre, apellido, email (= username), contraseña (mín. 6), rol, y opcional
   "pedir cambio de contraseña en el primer login".
4. Acciones por fila: 🔑 blanquear contraseña · ⏻ activar/desactivar · 🗑 eliminar.
5. El usuario nuevo puede loguearse de inmediato con email + contraseña.

## Pendientes antes de prod

- [ ] **No usar el admin de `master` en prod.** Crear un *service account* dedicado: en el client
      confidencial `imedba-backend` (ya tiene `serviceAccountsEnabled=true`), asignarle del client
      `realm-management` los roles `manage-users` y `view-users`. Luego cambiar la config a grant
      `client_credentials` con ese client/secret en vez de `password` con admin/admin.
      (Se dejó password-grant para que ande en dev sin fricción.)
- [ ] **Validaciones de negocio**: impedir que un admin se elimine/desactive a sí mismo; impedir
      borrar el último ADMIN.
- [ ] **Auditoría**: registrar quién creó/editó/eliminó usuarios.
- [ ] **UX**: el blanqueo de contraseña usa `window.prompt` (MVP). Pasar a un modal con confirmación
      y opción "temporal".
- [ ] **Paginación/búsqueda** si la lista crece (hoy trae hasta 500 usuarios sin paginar).
- [ ] **Email de bienvenida** con credenciales (engancha con el módulo de mail —
      ver `12-notificaciones-mail-whatsapp.md`).

## Notas para el handoff (Santi back / Fran front)

- El módulo es full-stack y lo armó la sesión "todo-en-uno". Cuando se vuelva a separar:
  - **Santi**: dueño de `modules/useradmin/`, la config `keycloak.admin.*`, el service account de prod.
  - **Fran**: dueño de `pages/Personal.tsx`, `api/users.ts`, `types/user.ts`.
- El contrato es `AppUserResponse` / `CreateUserRequest` / `UpdateUserRequest` / `ResetPasswordRequest`
  (espejo 1:1 en `types/user.ts`).
