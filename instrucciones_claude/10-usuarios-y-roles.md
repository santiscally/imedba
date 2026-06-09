# Usuarios, roles y permisos — IMEDBA

> Cómo loguearse con los distintos usuarios de prueba, qué ve y qué puede hacer cada
> rol, y dónde se administran los usuarios. Última actualización: 2026-06-08.

## ¿Quién maneja los usuarios? → **Keycloak**

**Sí: los usuarios los maneja Keycloak**, no el backend ni la base de la app.

- Realm: **`imedba`** (en la instancia Keycloak del stack).
- El backend (`imedba-backend`) es sólo un **resource server**: valida el JWT que emite Keycloak y autoriza por `@PreAuthorize`. No tiene tabla de usuarios ni guarda contraseñas.
- El login del SPA es **ROPC** (formulario propio email + contraseña que va contra Keycloak), client público `imedba-frontend`.

## Cómo loguearse (dev)

1. Levantar el stack (`docker compose up -d db keycloak backend`) y el front (`cd frontend && npm run dev`).
2. Abrir el SPA en **http://localhost:5173**.
3. Ingresar **email + contraseña** de alguno de los usuarios de abajo. El SPA aterriza
   automáticamente en la primera sección que ese rol puede ver.

> Todos los usuarios de prueba tienen contraseña **`test1234`**.

## Usuarios de prueba (realm export)

| Email | Contraseña | Rol (realm) | Para qué |
|-------|-----------|-------------|----------|
| `admin@imedba.dev`      | `test1234` | ADMIN        | Acceso total (las 3 socias) |
| `vendedora@imedba.dev`  | `test1234` | VENDEDORA    | Carga alumnos/inscripciones y cobra (solo ve **sus** inscripciones) |
| `secretaria@imedba.dev` | `test1234` | SECRETARIA_FS| Secretaría de Formación Superior (diplomaturas + liquidaciones) |
| `editorial@imedba.dev`  | `test1234` | EDITORIAL    | Libros, colecciones, ventas, autorías |
| `contable@imedba.dev`   | `test1234` | CONTABLE     | Presupuesto, ventas, contactos |
| `viewer@imedba.dev`     | `test1234` | VIEWER       | Solo lectura global (ve todo, no edita nada) |

## Qué ve y qué edita cada rol (verificado contra los tokens reales)

El SPA gatea el **menú y las rutas** por la authority de lectura (`módulo:read`), y los
**botones de alta/edición/borrado** por la de escritura (`módulo:write`). Es espejo 1:1
de los `@PreAuthorize` del backend, así que la UI nunca ofrece algo que termine en 403.

| Rol | Secciones que VE | Dónde puede ESCRIBIR (crear/editar/borrar) |
|-----|------------------|--------------------------------------------|
| **ADMIN** | Todas | Todas |
| **VENDEDORA** | Dashboard, Alumnos, Cursos, Inscripciones, Cuotas, Descuentos, Contactos, Notificaciones | Alumnos, Inscripciones, Cuotas (pagos) |
| **SECRETARIA_FS** | Dashboard, Alumnos, Inscripciones, Cuotas, Diplomaturas, Liquidaciones, Contactos, Notificaciones | Diplomaturas, Liquidaciones |
| **EDITORIAL** | Dashboard, Alumnos, Libros, Colecciones, Ventas | Libros, Colecciones, Ventas |
| **CONTABLE** | Presupuesto, Ventas, Contactos | Presupuesto |
| **VIEWER** | Todas | Nada (solo lectura) |

Notas:
- **VENDEDORA** ve Cursos/Descuentos en modo **lectura** (no tiene `courses:write` ni
  `discount_campaigns:write`), por eso no le aparecen los botones de alta/edición ahí.
- **SECRETARIA_FS** no tiene `courses:read` → no ve Cursos.
- **CONTABLE** no tiene `students:read` → no ve Dashboard/Alumnos; aterriza en Presupuesto.
- **Colecciones**: el CRUD requiere `books:write` y "Vender colección" requiere
  `book_sales:write` (EDITORIAL y ADMIN tienen ambas).
- La regla **"vendedora solo ve sus inscripciones"** (`enrolled_by` = ella) la aplica el
  **backend**, no la UI.

## Dónde se administran los usuarios

**Consola de administración de Keycloak**: http://localhost:8081/admin/ (admin de Keycloak
`admin` / `admin` en dev).

- Crear/editar usuarios: realm `imedba` → *Users*.
- Asignar rol: en el usuario → *Role mapping* → asignar uno de los realm roles
  (`ADMIN`, `VENDEDORA`, `SECRETARIA_FS`, `EDITORIAL`, `CONTABLE`, `VIEWER`).
- Resetear contraseña: usuario → *Credentials*.
- Los usuarios de prueba de arriba vienen sembrados en el realm export
  (`keycloak/realms/imedba-realm.json`); en un Keycloak ya levantado se editan por consola.

> **Importante**: al cambiar roles/permisos de un usuario, debe **cerrar sesión y volver a
> entrar** para que el JWT nuevo traiga las authorities actualizadas.

## Cómo funcionan los permisos por dentro (referencia técnica)

El JWT trae authorities en **dos namespaces** (ver `CLAUDE.md` §Contrato front↔back):

- `realm_access.roles` → roles con prefijo `ROLE_` (ej. `ROLE_admin`, `ROLE_vendedora`).
- `resource_access.imedba-backend.roles` → authorities por módulo (ej. `students:read`,
  `diplomas:write`). **Sobre estas** se hace el `@PreAuthorize` y el gating del front.

Las authorities por módulo ya vienen **compuestas dentro de cada rol** en Keycloak (un
ADMIN las tiene todas, una VENDEDORA un subconjunto, etc.). Si el realm vivo no las tiene
(porque se agregó una nueva), correr `scripts/kc-sync-authorities.sh` para aplicarlas sin
resetear el realm.

El mapa front ruta→authority vive en `frontend/src/lib/access.ts` (`ROUTE_AUTHORITY` para
lectura, `ROUTE_WRITE_AUTHORITY` para escritura). Si el backend cambia la authority de un
endpoint, actualizar también ahí (no hay codegen).
