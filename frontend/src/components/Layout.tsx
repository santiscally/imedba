import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'
import './Layout.scss'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="layout">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />
      <div className="layout__main">
        <Topbar />
        <main className="layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
