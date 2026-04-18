import { Construction } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './Placeholder.scss'

export default function Placeholder() {
  const { pathname } = useLocation()
  const section = pathname.replace('/', '')

  return (
    <div className="placeholder">
      <div className="placeholder__icon">
        <Construction size={28} strokeWidth={1.8} />
      </div>
      <h2 className="placeholder__title">Módulo en construcción</h2>
      <p className="placeholder__desc">
        La sección <strong>{section}</strong> todavía no está implementada.
        <br />
        Próximamente disponible.
      </p>
    </div>
  )
}
