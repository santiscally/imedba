import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { currentUser, logout } from '../lib/auth'
import { ROLE_LABELS } from '../types/user'
import './Topbar.scss'

// Mes y año actuales, capitalizado (ej. "Junio 2026"). Sin hardcodeo.
function currentMonthYear(): string {
  const now = new Date()
  const month = now.toLocaleDateString('es-AR', { month: 'long' })
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${now.getFullYear()}`
}

// Primer rol de app del JWT, como label legible (map canónico en types/user.ts).
function roleLabel(roles: string[]): string {
  const match = roles.find(r => ROLE_LABELS[r])
  return match ? ROLE_LABELS[match] : 'Usuario'
}

const TITLES: Record<string, string> = {
  '/dashboard':      'Dashboard',
  '/rm/alumnos':       'Alumnos · Residencias Médicas',
  '/rm/cursos':        'Cursos · Residencias Médicas',
  '/rm/inscripciones': 'Inscripciones · Residencias Médicas',
  '/fs/alumnos':       'Alumnos · Formación Superior',
  '/fs/diplomaturas':  'Diplomaturas · Formación Superior',
  '/fs/inscripciones': 'Inscripciones · Formación Superior',
  '/cuotas':         'Cuotas y Pagos',
  '/descuentos':     'Descuentos',
  '/presupuesto':    'Presupuesto',
  '/libros':         'Libros',
  '/ventas':         'Ventas',
  '/autores':        'Autores',
  '/colecciones':    'Colecciones',
  '/liquidaciones':  'Liquidaciones',
  '/personal':       'Usuarios',
  '/personal-academico': 'Personal Académico',
  '/clases':         'Clases',
}

export default function Topbar() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const title = TITLES[location.pathname] ?? 'IMEDBA'

  // Usuario real desde el JWT (no hardcodeado).
  const user      = currentUser()
  const userName  = user?.fullName || user?.username || user?.email || 'Usuario'
  const userEmail = user?.email ?? ''
  const userRole  = roleLabel(user?.roles ?? [])
  const initial   = userName.charAt(0).toUpperCase()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="topbar">

      <div className="topbar__left">
        <h1 className="topbar__title">{title}</h1>
        <span className="topbar__breadcrumb">{currentMonthYear()}</span>
      </div>

      <div className="topbar__right">

        <div className="topbar__user" ref={menuRef}>
          <button
            className={`topbar__user-btn ${menuOpen ? 'topbar__user-btn--open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
          >
            <div className="topbar__avatar">{initial}</div>
            <div className="topbar__user-info">
              <div className="topbar__user-name">{userName}</div>
              <div className="topbar__user-role">{userRole}</div>
            </div>
            <ChevronDown size={16} className="topbar__chevron" />
          </button>

          {menuOpen && (
            <div className="topbar__dropdown" role="menu">
              <div className="topbar__dropdown-header">
                <div className="topbar__user-name">{userName}</div>
                {userEmail && <div className="topbar__user-email">{userEmail}</div>}
              </div>
              <button
                className="dropdown-item dropdown-item--danger"
                role="menuitem"
                onClick={() => logout()}
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

      </div>

    </header>
  )
}
