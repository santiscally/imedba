import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo_imedba.png'
import { isAuthenticated, loginWithPassword } from '../lib/auth'
import './Login.scss'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!USE_MOCK && isAuthenticated()) navigate('/dashboard', { replace: true })
  }, [navigate])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (USE_MOCK) {
        await new Promise(r => setTimeout(r, 400))
        navigate('/dashboard')
        return
      }
      await loginWithPassword(username.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo iniciar sesión'
      setError(msg === 'invalid_grant' ? 'Usuario o contraseña incorrectos' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      <div className="login-brand">
        <img src={logo} alt="IMEDBA" className="login-brand__logo" />
        <p className="login-brand__tagline">Instituto de Educación Médica</p>
      </div>

      <div className="login-form-side">
        <div className="login-card">
          <h1>Bienvenido</h1>
          <p className="login-card__subtitle">
            {USE_MOCK ? 'Modo demo (sin backend). Hacé clic para ingresar.' : 'Ingresá con tu cuenta'}
          </p>

          <form onSubmit={handleSignIn} noValidate>
            {!USE_MOCK && (
              <>
                <label className="field">
                  <span>Usuario o email</span>
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoFocus
                  />
                </label>
                <label className="field">
                  <span>Contraseña</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </label>
                {error && <p className="login-error" role="alert">{error}</p>}
              </>
            )}

            <button type="submit" className="btn-ingresar" disabled={loading || (!USE_MOCK && (!username || !password))}>
              {loading ? 'Ingresando…' : USE_MOCK ? 'Entrar (demo)' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>

    </div>
  )
}
