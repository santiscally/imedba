import { hasAuthority } from './auth'

// Cada ruta pide la authority de su sección del menú + la de lectura de su listado (espeja el @PreAuthorize).
const ACADEMICO = 'academico:read'
const FINANZAS  = 'finanzas:read'
const EDITORIAL = 'editorial:read'

export const ROUTE_AUTHORITY: Record<string, string[]> = {
  '/dashboard':          ['dashboard:read'],
  '/rm/alumnos':         [ACADEMICO, 'residencias:read', 'students:read'],
  '/rm/cursos':          [ACADEMICO, 'residencias:read', 'courses:read'],
  '/rm/inscripciones':   [ACADEMICO, 'residencias:read', 'enrollments:read'],
  '/fs/alumnos':         [ACADEMICO, 'formacion_superior:read', 'students:read'],
  '/fs/diplomaturas':    [ACADEMICO, 'formacion_superior:read', 'diplomas:read'],
  '/fs/inscripciones':   [ACADEMICO, 'formacion_superior:read', 'enrollments:read'],
  '/personal-academico': [ACADEMICO, 'staff:read'],      // docentes/tutoras/preceptoras/directoras (≠ /personal)
  '/clases':             [ACADEMICO, 'hour_logs:read'],  // grilla de clases dictadas (alimenta la liquidación)
  '/cuotas':             [FINANZAS, 'installments:read'],
  '/descuentos':         [FINANZAS, 'discount_campaigns:read'],
  '/liquidaciones':      [FINANZAS, 'settlements:read'],
  '/presupuesto':        [FINANZAS, 'budget:read'],
  '/libros':             [EDITORIAL, 'books:read'],
  '/colecciones':        [EDITORIAL, 'books:read'],      // CollectionController usa books:read
  '/ventas':             [EDITORIAL, 'book_sales:read'],
  '/autores':            [EDITORIAL, 'authors:read'],
  '/personal':           ['admin:manage'],               // gestión de usuarios Keycloak → SOLO admin
}

/** true si el usuario puede acceder a la ruta. Rutas sin regla (ej. /auth/callback) quedan abiertas. */
export function canAccess(path: string): boolean {
  const required = ROUTE_AUTHORITY[path]
  if (!required) return true
  return required.every(hasAuthority)
}

// Escritura por página, no por ruta (/alumnos vale para RM y FS); /cuotas y /colecciones usan hasAuthority directo.
export const ROUTE_WRITE_AUTHORITY: Record<string, string> = {
  '/alumnos':       'students:write',
  '/cursos':        'courses:write',
  '/inscripciones': 'enrollments:write',
  '/personal-academico': 'staff:write',
  '/clases':        'hour_logs:write',
  '/descuentos':    'discount_campaigns:write',
  '/diplomaturas':  'diplomas:write',
  '/liquidaciones': 'settlements:write',
  '/presupuesto':   'budget:write',
  '/libros':        'books:write',
  '/ventas':        'book_sales:write',
  '/personal':      'admin:manage',        // alta/edición de usuarios → SOLO admin
  '/autores':       'authors:write',
}

/** true si el usuario puede escribir (crear/editar/borrar) en la página. Sin regla → true. */
export function canWrite(path: string): boolean {
  const required = ROUTE_WRITE_AUTHORITY[path]
  if (!required) return true
  return hasAuthority(required)
}

// Landing post-login y destino cuando se entra a una ruta sin permiso.
const HOME_ORDER = [
  '/dashboard', '/rm/alumnos', '/fs/alumnos', '/rm/inscripciones', '/fs/inscripciones',
  '/cuotas', '/rm/cursos', '/fs/diplomaturas', '/personal-academico', '/clases',
  '/liquidaciones', '/descuentos', '/presupuesto',
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
