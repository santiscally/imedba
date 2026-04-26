import { Link, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users, BookOpen, FileText,
  CreditCard, Tag, Wallet,
  Book, ShoppingBag, PenTool,
  GraduationCap, Calculator,
  Briefcase, Clock, Mail, Bell,
  ChevronLeft,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import logo from '../assets/logo_imedba.png'
import './Sidebar.scss'

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
      { to: '/libros',  icon: Book,        label: 'Libros'  },
      { to: '/ventas',  icon: ShoppingBag, label: 'Ventas'  },
      { to: '/autores', icon: PenTool,     label: 'Autores' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { to: '/personal',      icon: Briefcase, label: 'Personal'      },
      { to: '/horas',         icon: Clock,     label: 'Horas'         },
      { to: '/contactos',     icon: Mail,      label: 'Contactos'     },
      { to: '/notificaciones',icon: Bell,      label: 'Notificaciones'},
    ],
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
        {NAV.map((group, i) => (
          <div className="nav-group" key={i}>
            {group.title && !collapsed && (
              <div className="nav-group__title">{group.title}</div>
            )}
            {group.title && collapsed && <div className="nav-group__sep" />}
            {group.items.map(item => {
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
        ))}
      </nav>

    </aside>
  )
}
