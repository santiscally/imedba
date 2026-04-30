import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo_imedba.png'
import { isAuthenticated, login } from '../lib/auth'
import './Login.scss'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Si ya hay sesión activa, saltar directo al dashboard.
  useEffect(() => {
    if (!USE_MOCK && isAuthenticated()) navigate('/dashboard', { replace: true })
  }, [navigate])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    if (USE_MOCK) {
      // Modo mock: bypass auth, navegamos directo.
      setTimeout(() => navigate('/dashboard'), 600)
      return
    }
    await login('/dashboard')
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
            {USE_MOCK
              ? 'Modo demo (sin backend). Hacé clic para ingresar.'
              : 'Ingresá con tu cuenta institucional'}
          </p>

          <form onSubmit={handleSignIn} noValidate>
            <button type="submit" className="btn-ingresar" disabled={loading}>
              {loading
                ? 'Redirigiendo…'
                : USE_MOCK ? 'Entrar (demo)' : 'Ingresar con Keycloak'}
            </button>
          </form>
        </div>
      </div>

    </div>
  )
}
