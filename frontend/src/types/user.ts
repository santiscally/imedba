// Usuario de la app (vive en Keycloak). Espeja AppUserResponse del backend.

export interface AppUser {
  id:        string
  username:  string
  email:     string | null
  firstName: string | null
  lastName:  string | null
  enabled:   boolean
  roles:     string[]        // roles de realm de la app (ADMIN, VENDEDORA, …)
}

export interface CreateUserRequest {
  email:             string
  firstName:         string
  lastName:          string
  password:          string
  role:              string
  temporaryPassword: boolean
}

export interface UpdateUserRequest {
  firstName?: string
  lastName?:  string
  enabled?:   boolean
  role?:      string
}

export interface ResetPasswordRequest {
  password:  string
  temporary: boolean
}

// Label legible por rol (mismo criterio que el Topbar).
export const ROLE_LABELS: Record<string, string> = {
  ADMIN:         'Administrador',
  VENDEDORA:     'Vendedora',
  SECRETARIA_FS: 'Secretaría FS',
  EDITORIAL:     'Editorial',
  CONTABLE:      'Contable',
  VIEWER:        'Solo lectura',
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}
