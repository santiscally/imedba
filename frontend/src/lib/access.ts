import { hasAuthority } from './auth'

/**
 * Control de acceso del SPA por **authority** (no por rol). Espeja 1:1 los
 * `@PreAuthorize("hasAuthority('<x>:read')")` de los endpoints de listado del
 * backend, así el menú/rutas reflejan exactamente lo que el usuario puede usar.
 *
 * Como las authorities `module:action` ya vienen compuestas por rol desde Keycloak
 * (ADMIN tiene todas, VENDEDORA un subconjunto, etc.), no hace falta hardcodear
 * mapeos rol→pantalla: alcanza con chequear la authority de lectura.
 *
 * Si el backend cambia la authority de un listado, actualizar acá también
 * (no hay codegen — se sincroniza a mano, igual que los tipos).
 */
export const ROUTE_AUTHORITY: Record<string, string> = {
  '/dashboard':      'students:read',
  '/alumnos':        'students:read',
  '/cursos':         'courses:read',
  '/inscripciones':  'enrollments:read',
  '/personal-academico': 'staff:read',   // docentes/tutoras/preceptoras/directoras (≠ /personal)
  '/clases':         'hour_logs:read',   // grilla de clases dictadas (alimenta la liquidación)
  '/cuotas':         'installments:read',
  '/descuentos':     'discount_campaigns:read',
  '/diplomaturas':   'diplomas:read',
  '/liquidaciones':  'diplomas:read',     // DiplomaSettlementController usa diplomas:read
  '/presupuesto':    'budget:read',
  '/libros':         'books:read',
  '/colecciones':    'books:read',        // CollectionController usa books:read
  '/ventas':         'book_sales:read',
  '/personal':       'admin:manage',       // gestión de usuarios Keycloak → SOLO admin
  '/autores':        'authors:read',
}

/** true si el usuario puede acceder a la ruta. Rutas sin regla (ej. /auth/callback) quedan abiertas. */
export function canAccess(path: string): boolean {
  const required = ROUTE_AUTHORITY[path]
  if (!required) return true
  return hasAuthority(required)
}

/**
 * Authority de **escritura** por ruta (espeja los `@PreAuthorize('<x>:write')` de
 * los POST/PUT/DELETE). Se usa para ocultar botones de alta/edición/borrado.
 *
 * Páginas con varias acciones de distinta authority NO van acá — se chequean con
 * `hasAuthority` directo en la página:
 *   - /cuotas → payments:write (registrar/anular pago) vs installments:write (editar cuota)
 *   - /colecciones → books:write (CRUD) vs book_sales:write (vender colección)
 */
export const ROUTE_WRITE_AUTHORITY: Record<string, string> = {
  '/alumnos':       'students:write',
  '/cursos':        'courses:write',
  '/inscripciones': 'enrollments:write',
  '/personal-academico': 'staff:write',
  '/clases':        'hour_logs:write',
  '/descuentos':    'discount_campaigns:write',
  '/diplomaturas':  'diplomas:write',
  '/liquidaciones': 'diplomas:write',     // DiplomaSettlementController usa diplomas:write
  '/presupuesto':   'budget:write',
  '/libros':        'books:write',
  '/ventas':        'book_sales:write',
  '/personal':      'admin:manage',        // alta/edición de usuarios → SOLO admin
  '/autores':       'authors:write',
}

/** true si el usuario puede escribir (crear/editar/borrar) en la ruta. Sin regla → true. */
export function canWrite(path: string): boolean {
  const required = ROUTE_WRITE_AUTHORITY[path]
  if (!required) return true
  return hasAuthority(required)
}

// Orden de preferencia para el landing post-login y para redirigir cuando se
// entra a una ruta sin permiso. El Dashboard primero; si no lo puede ver, su
// primera sección accesible.
const HOME_ORDER = [
  '/dashboard', '/alumnos', '/inscripciones', '/cuotas', '/cursos',
  '/personal-academico', '/clases',
  '/diplomaturas', '/liquidaciones', '/descuentos', '/presupuesto',
  '/libros', '/colecciones', '/ventas',
  '/personal',
]

/** Primera ruta accesible para el usuario actual, o null si no tiene ninguna. */
export function firstAccessiblePath(): string | null {
  for (const p of HOME_ORDER) {
    if (canAccess(p)) return p
  }
  return null
}
