import { Link, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users, BookOpen, FileText,
  CreditCard, Tag, Wallet,
  Book, ShoppingBag, Library,
  GraduationCap, Calculator, Presentation,
  UserCog, CalendarDays,
  ChevronLeft, LogOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import logo from '../assets/logo_imedba.png'
import { currentUser, logout } from '../lib/auth'
import { canAccess } from '../lib/access'
import './Sidebar.scss'

interface NavItem {
  to:    string
  icon:  LucideIcon
  label: string
}

interface NavSection {
  title: string | null
  items: NavItem[]
}

interface NavGroup {
  title:    string | null
  sections: NavSection[]
}

const single = (items: NavItem[]): NavSection[] => [{ title: null, items }]

const NAV: NavGroup[] = [
  {
    title: null,
    sections: single([
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ]),
  },
  {
    // Residencias y Formación Superior por separado (docx IMEDBA 2026-09-24).
    title: 'Académico',
    sections: [
      {
        title: 'Residencias Médicas',
        items: [
          { to: '/rm/alumnos',       icon: Users,         label: 'Alumnos'       },
          { to: '/rm/cursos',        icon: BookOpen,      label: 'Cursos'        },
          { to: '/rm/inscripciones', icon: FileText,      label: 'Inscripciones' },
        ],
      },
      {
        title: 'Formación Superior',
        items: [
          { to: '/fs/alumnos',       icon: Users,         label: 'Alumnos'       },
          { to: '/fs/diplomaturas',  icon: GraduationCap, label: 'Diplomaturas'  },
          { to: '/fs/inscripciones', icon: FileText,      label: 'Inscripciones' },
        ],
      },
      {
        title: null,
        items: [
          // OJO: distinto de /personal, que son los usuarios de Keycloak (abajo, "Usuarios").
          { to: '/personal-academico', icon: Presentation, label: 'Personal Académico' },
          { to: '/clases',             icon: CalendarDays, label: 'Clases'             },
        ],
      },
    ],
  },
  {
    title: 'Finanzas',
    sections: single([
      { to: '/cuotas',        icon: CreditCard, label: 'Cuotas y Pagos' },
      { to: '/descuentos',    icon: Tag,        label: 'Descuentos'     },
      { to: '/liquidaciones', icon: Calculator, label: 'Liquidaciones'  },
      { to: '/presupuesto',   icon: Wallet,     label: 'Presupuesto'    },
    ]),
  },
  {
    title: 'Editorial',
    sections: single([
      { to: '/libros',      icon: Book,        label: 'Libros'      },
      { to: '/colecciones', icon: Library,     label: 'Colecciones' },
      { to: '/ventas',      icon: ShoppingBag, label: 'Ventas'      },
    ]),
  },
  {
    title: 'Administración',
    sections: single([
      { to: '/personal', icon: UserCog, label: 'Usuarios' },   // solo admin
    ]),
  },
]

interface Props {
  collapsed: boolean
  onToggle:  () => void
}

export default function Sidebar({ collapsed, onToggle }: Props) {
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
          const sections = group.sections
            .map(sec => ({ ...sec, items: sec.items.filter(it => canAccess(it.to)) }))
            .filter(sec => sec.items.length > 0)
          if (sections.length === 0) return null
          return (
          <div className="nav-group" key={i}>
            {group.title && !collapsed && (
              <div className="nav-group__title">{group.title}</div>
            )}
            {group.title && collapsed && <div className="nav-group__sep" />}
            {sections.map((sec, j) => (
              <div key={j}>
                {sec.title && !collapsed && <div className="nav-group__subtitle">{sec.title}</div>}
                {sec.items.map(item => (
                  <NavEntry key={item.to} item={item} area={sec.title} collapsed={collapsed} />
                ))}
              </div>
            ))}
          </div>
          )
        })}
      </nav>

      <SidebarFooter collapsed={collapsed} />

    </aside>
  )
}

function NavEntry({ item, area, collapsed }: { item: NavItem; area: string | null; collapsed: boolean }) {
  const Icon = item.icon
  // Con el menú colapsado el tooltip suma el área: si no, hay dos "Alumnos" iguales.
  const tooltip = area ? `${item.label} · ${area}` : item.label
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
      title={collapsed ? tooltip : undefined}
    >
      <Icon size={18} className="nav-item__icon" strokeWidth={2} />
      {!collapsed && <span className="nav-item__label">{item.label}</span>}
    </NavLink>
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
