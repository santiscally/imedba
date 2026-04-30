import { useEffect, type ReactNode } from 'react'
import { isAuthenticated, login } from '../lib/auth'
import { useLocation } from 'react-router-dom'

// Wrapper para rutas privadas. Si no hay sesión activa, redirige a Keycloak
// con la ruta actual como `returnPath` para volver acá tras el login.
//
// Si VITE_USE_MOCK=true se considera siempre autenticado (modo dev sin backend).
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

interface Props {
  children: ReactNode
}

export default function RequireAuth({ children }: Props) {
  const loc = useLocation()
  const ok = USE_MOCK || isAuthenticated()

  useEffect(() => {
    if (!ok) {
      void login(loc.pathname + loc.search)
    }
  }, [ok, loc.pathname, loc.search])

  if (!ok) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', color: '#666', fontSize: '0.9rem',
      }}>
        Redirigiendo al login…
      </div>
    )
  }

  return <>{children}</>
}
