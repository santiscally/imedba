import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo_imedba.png'
import './Home.scss'

const NAV_ITEMS = [
  { icon: '▪', label: 'Dashboard',        id: 'dashboard'     },
  { icon: '▪', label: 'Alumnos',          id: 'alumnos'        },
  { icon: '▪', label: 'Cursos',           id: 'cursos'         },
  { icon: '▪', label: 'Inscripciones',    id: 'inscripciones'  },
  { icon: '▪', label: 'Cuotas y Pagos',   id: 'cuotas'         },
  { icon: '▪', label: 'Libros',           id: 'libros'         },
  { icon: '▪', label: 'Diplomas',         id: 'diplomas'       },
  { icon: '▪', label: 'Presupuesto',      id: 'presupuesto'    },
  { icon: '▪', label: 'Personal',         id: 'personal'       },
]

const STATS = [
  { label: 'Alumnos activos',    value: '142',       color: '#2563eb' },
  { label: 'Cursos activos',     value: '8',         color: '#16a34a' },
  { label: 'Cuotas pendientes',  value: '23',        color: '#d97706' },
  { label: 'Ingresos del mes',   value: '$480.000',  color: '#08323C' },
]

const INSCRIPCIONES = [
  { alumno: 'Ana García',      curso: 'Cardiología Básica',   fecha: '01/04/2026', estado: 'Activa',    cuotas: 6  },
  { alumno: 'Carlos Méndez',   curso: 'Emergencias',          fecha: '28/03/2026', estado: 'Activa',    cuotas: 3  },
  { alumno: 'María López',     curso: 'Pediatría Avanzada',   fecha: '25/03/2026', estado: 'Pendiente', cuotas: 12 },
  { alumno: 'Luis Romero',     curso: 'Cirugía General',      fecha: '20/03/2026', estado: 'Activa',    cuotas: 6  },
  { alumno: 'Sofía Herrera',   curso: 'Diagnóstico por Img.', fecha: '15/03/2026', estado: 'Activa',    cuotas: 4  },
]

export default function Home() {
  const [activeNav, setActiveNav] = useState('dashboard')
  const navigate = useNavigate()

  return (
    <div className="home-layout">

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__header">
          <img src={logo} alt="IMEDBA" className="sidebar__logo" />
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeNav === item.id ? 'nav-item--active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="nav-item__icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">A</div>
            <div>
              <p className="sidebar__user-name">Admin</p>
              <p className="sidebar__user-role">Administrador</p>
            </div>
          </div>
          <button className="btn-logout" onClick={() => navigate('/')}>
            Salir
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="main-area">

        {/* Top bar */}
        <header className="topbar">
          <h2 className="topbar__title">
            {NAV_ITEMS.find(i => i.id === activeNav)?.label ?? 'Dashboard'}
          </h2>
          <span className="topbar__date">Abril 2026</span>
        </header>

        {/* Contenido */}
        <main className="content">

          {/* Stats */}
          <div className="stats-grid">
            {STATS.map(stat => (
              <div className="stat-card" key={stat.label}>
                <div className="stat-card__value" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="stat-card__label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Tabla reciente */}
          <div className="table-card">
            <div className="table-card__header">
              <h3>Inscripciones recientes</h3>
              <button className="btn-ver-todo">Ver todo →</button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Curso</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Cuotas</th>
                  </tr>
                </thead>
                <tbody>
                  {INSCRIPCIONES.map((row, i) => (
                    <tr key={i}>
                      <td>{row.alumno}</td>
                      <td>{row.curso}</td>
                      <td>{row.fecha}</td>
                      <td>
                        <span className={`badge badge--${row.estado.toLowerCase()}`}>
                          {row.estado}
                        </span>
                      </td>
                      <td>{row.cuotas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

    </div>
  )
}
