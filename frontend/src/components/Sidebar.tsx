import { Link, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users, BookOpen, FileText,
  CreditCard, Tag, Wallet,
  Book, ShoppingBag, Library,
  GraduationCap, Calculator,
  Briefcase,
  ChevronLeft, LogOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import logo from '../assets/logo_imedba.png'
import { currentUser, logout } from '../lib/auth'
import { canAccess } from '../lib/access'
import { useUnidad } from '../lib/unidad'
import './Sidebar.scss'

// Secciones que pertenecen exclusivamente a Formación Superior: con la unidad
// "Residencias Médicas" seleccionada no tiene sentido mostrarlas.
const FS_ONLY_ROUTES = new Set(['/diplomaturas', '/liquidaciones'])

interface NavItem {
  to:    string
  icon:  LucideIcon
  label: string
}

interface NavGroup {
  title: string | null
  items: NavItem[]
}

const NAV: NavGroup[] = [
  {
    title: null,
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    title: 'Académico',
    items: [
      { to: '/alumnos',       icon: Users,    label: 'Alumnos'       },
      { to: '/cursos',        icon: BookOpen, label: 'Cursos'        },
      { to: '/inscripciones', icon: FileText, label: 'Inscripciones' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { to: '/cuotas',        icon: CreditCard,    label: 'Cuotas y Pagos' },
      { to: '/descuentos',    icon: Tag,           label: 'Descuentos'     },
      { to: '/diplomaturas',  icon: GraduationCap, label: 'Diplomaturas'   },
      { to: '/liquidaciones', icon: Calculator,    label: 'Liquidaciones'  },
      { to: '/presupuesto',   icon: Wallet,        label: 'Presupuesto'    },
    ],
  },
  {
    title: 'Editorial',
    items: [
      { to: '/libros',      icon: Book,        label: 'Libros'      },
      { to: '/colecciones', icon: Library,     label: 'Colecciones' },
      { to: '/ventas',      icon: ShoppingBag, label: 'Ventas'      },
    ],
  },
  {
    title: 'Administración',
    items: [
      { to: '/personal', icon: Briefcase, label: 'Personal' },   // usuarios Keycloak — solo admin
    ],
  },
]

interface Props {
  collapsed: boolean
  onToggle:  () => void
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const { unidad } = useUnidad()
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>

      <div className="sidebar__header">
        <Link to="/dashboard" className="sidebar__brand-link">
          <img src={logo} alt="IMEDBA" className="sidebar__logo" />
          {!collapsed && <span className="sidebar__brand">IMEDBA</span>}
        </Link>
        <button
          className="sidebar__toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <nav className="sidebar__nav">
        {NAV.map((group, i) => {
          // Sólo mostramos los items a los que el usuario tiene acceso (por authority)
          // y que correspondan a la unidad de negocio seleccionada.
          const items = group.items.filter(it =>
            canAccess(it.to) && !(unidad === 'RESIDENCIAS' && FS_ONLY_ROUTES.has(it.to)))
          if (items.length === 0) return null
          return (
          <div className="nav-group" key={i}>
            {group.title && !collapsed && (
              <div className="nav-group__title">{group.title}</div>
            )}
            {group.title && collapsed && <div className="nav-group__sep" />}
            {items.map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  to={item.to}
                  key={item.to}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'nav-item--active' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} className="nav-item__icon" strokeWidth={2} />
                  {!collapsed && <span className="nav-item__label">{item.label}</span>}
                </NavLink>
              )
            })}
          </div>
          )
        })}
      </nav>

      <SidebarFooter collapsed={collapsed} />

    </aside>
  )
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const user = currentUser()
  const handleLogout = () => { logout() }
  return (
    <div className="sidebar__footer">
      {!collapsed && (
        <div className="sidebar__user">
          <div className="sidebar__user-name">
            {user?.fullName ?? user?.username ?? user?.email ?? '—'}
          </div>
          {user?.email && (
            <div className="sidebar__user-email">{user.email}</div>
          )}
        </div>
      )}
      <button
        className="sidebar__logout"
        onClick={handleLogout}
        title={collapsed ? 'Cerrar sesión' : undefined}
      >
        <LogOut size={16} />
        {!collapsed && <span>Cerrar sesión</span>}
      </button>
    </div>
  )
}
