import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleCallback } from '../lib/auth'

// Ruta `/auth/callback` — Keycloak redirige acá tras el login con `?code=...`.
// Intercambiamos el code por tokens y luego mandamos al `returnPath` original
// (guardado en sessionStorage antes del redirect).
export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    handleCallback()
      .then(returnTo => navigate(returnTo, { replace: true }))
      .catch((err: Error) => setError(err.message))
  }, [navigate])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', flexDirection: 'column', gap: '1rem',
      color: '#666', fontSize: '0.9rem', padding: '2rem',
    }}>
      {error
        ? <>
            <strong style={{ color: '#c33' }}>Error en el login</strong>
            <pre style={{ maxWidth: 600, whiteSpace: 'pre-wrap' }}>{error}</pre>
            <a href="/">Volver al inicio</a>
          </>
        : <>Procesando inicio de sesión…</>}
    </div>
  )
}
