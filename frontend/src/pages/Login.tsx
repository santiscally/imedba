import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo_imedba.png'
import './Login.scss'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => navigate('/home'), 900)
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
          <p className="login-card__subtitle">Ingresá con tu cuenta institucional</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@imedba.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn-ingresar" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>

    </div>
  )
}
