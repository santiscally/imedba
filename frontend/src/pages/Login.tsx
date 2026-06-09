import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo_imedba.png'
import { isAuthenticated, loginWithPassword } from '../lib/auth'
import { firstAccessiblePath } from '../lib/access'
import './Login.scss'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated()) navigate(firstAccessiblePath() ?? '/dashboard', { replace: true })
  }, [navigate])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await loginWithPassword(username.trim(), password)
      navigate(firstAccessiblePath() ?? '/dashboard', { replace: true })
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
          <p className="login-card__subtitle">Ingresá con tu cuenta</p>

          <form onSubmit={handleSignIn} noValidate>
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

            <button
              type="submit"
              className="btn-ingresar"
              disabled={loading || !username || !password}
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>

    </div>
  )
}
