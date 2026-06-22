import { useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'
import Footer  from './Footer'
import { canAccess, firstAccessiblePath } from '../lib/access'
import './Layout.scss'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const loc = useLocation()

  // Gating por authority: si la ruta no es accesible para el usuario, redirigir a
  // su primera sección disponible. Si no tiene ninguna, mostrar aviso (sin loop).
  const allowed = canAccess(loc.pathname)
  const home    = firstAccessiblePath()
  if (!allowed && home && home !== loc.pathname) {
    return <Navigate to={home} replace />
  }

  return (
    <div className="layout">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />
      <div className="layout__main">
        <Topbar />
        <main className="layout__content">
          {allowed ? <Outlet /> : <NoAccess />}
        </main>
        <Footer />
      </div>
    </div>
  )
}

function NoAccess() {
  return (
    <div className="no-access">
      <ShieldAlert size={40} strokeWidth={1.6} />
      <h3>Sin acceso</h3>
      <p>Tu usuario no tiene permisos para ver esta sección.</p>
    </div>
  )
}
