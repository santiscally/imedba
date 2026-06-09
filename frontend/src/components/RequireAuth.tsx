import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated } from '../lib/auth'

// Wrapper para rutas privadas. Si no hay sesión activa, redirige al Login propio
// del SPA (`/`), que hace ROPC (form email+password) contra Keycloak.
// Guardamos la ruta original en `state.from` para volver tras el login.
//
// Nota: NO usamos `login()` (PKCE redirect a la página hosteada de Keycloak) —
// el login se pivoteó a ROPC con form propio. `login()` queda en lib/auth.ts
// disponible por si en prod cambiamos de criterio.

interface Props {
  children: ReactNode
}

export default function RequireAuth({ children }: Props) {
  const loc = useLocation()
  const ok = isAuthenticated()

  if (!ok) {
    return <Navigate to="/" replace state={{ from: loc }} />
  }

  return <>{children}</>
}
