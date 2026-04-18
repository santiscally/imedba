import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Settings, UserCircle } from 'lucide-react'
import './Topbar.scss'

const TITLES: Record<string, string> = {
  '/dashboard':      'Dashboard',
  '/alumnos':        'Alumnos',
  '/cursos':         'Cursos',
  '/inscripciones':  'Inscripciones',
  '/cuotas':         'Cuotas y Pagos',
  '/descuentos':     'Descuentos',
  '/presupuesto':    'Presupuesto',
  '/libros':         'Libros',
  '/ventas':         'Ventas',
  '/autores':        'Autores',
  '/diplomas':       'Diplomas',
  '/liquidaciones':  'Liquidaciones',
  '/personal':       'Personal',
  '/horas':          'Registro de horas',
  '/contactos':      'Contactos',
  '/notificaciones': 'Notificaciones',
}

export default function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const title = TITLES[location.pathname] ?? 'IMEDBA'

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
        <span className="topbar__breadcrumb">Abril 2026</span>
      </div>

      <div className="topbar__right">

        <button className="topbar__icon-btn" aria-label="Notificaciones">
          <Bell size={18} strokeWidth={2} />
          <span className="topbar__badge" />
        </button>

        <div className="topbar__user" ref={menuRef}>
          <button
            className={`topbar__user-btn ${menuOpen ? 'topbar__user-btn--open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
          >
            <div className="topbar__avatar">A</div>
            <div className="topbar__user-info">
              <div className="topbar__user-name">Admin</div>
              <div className="topbar__user-role">Administrador</div>
            </div>
            <ChevronDown size={16} className="topbar__chevron" />
          </button>

          {menuOpen && (
            <div className="topbar__dropdown" role="menu">
              <div className="topbar__dropdown-header">
                <div className="topbar__user-name">Admin</div>
                <div className="topbar__user-email">admin@imedba.com</div>
              </div>
              <button className="dropdown-item" role="menuitem">
                <UserCircle size={16} />
                Mi perfil
              </button>
              <button className="dropdown-item" role="menuitem">
                <Settings size={16} />
                Configuración
              </button>
              <div className="topbar__dropdown-sep" />
              <button
                className="dropdown-item dropdown-item--danger"
                role="menuitem"
                onClick={() => navigate('/')}
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
