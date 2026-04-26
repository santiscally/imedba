import { Routes, Route, Navigate } from 'react-router-dom'
import Login         from './pages/Login'
import Layout        from './components/Layout'
import Dashboard     from './pages/Dashboard'
import Alumnos       from './pages/Alumnos'
import Cursos        from './pages/Cursos'
import Inscripciones from './pages/Inscripciones'
import Cuotas        from './pages/Cuotas'
import Descuentos    from './pages/Descuentos'
import Diplomaturas  from './pages/Diplomaturas'
import Liquidaciones from './pages/Liquidaciones'
import Presupuesto   from './pages/Presupuesto'
import Contactos     from './pages/Contactos'
import Placeholder   from './pages/Placeholder'

const MODULES = [
  'libros', 'ventas', 'autores',
  'personal', 'horas', 'notificaciones',
]

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<Layout />}>
        <Route path="/dashboard"     element={<Dashboard />} />
        <Route path="/alumnos"       element={<Alumnos />} />
        <Route path="/cursos"        element={<Cursos />} />
        <Route path="/inscripciones" element={<Inscripciones />} />
        <Route path="/cuotas"        element={<Cuotas />} />
        <Route path="/descuentos"    element={<Descuentos />} />
        <Route path="/diplomaturas"  element={<Diplomaturas />} />
        <Route path="/liquidaciones" element={<Liquidaciones />} />
        <Route path="/presupuesto"   element={<Presupuesto />} />
        <Route path="/contactos"     element={<Contactos />} />
        {MODULES.map(m => (
          <Route key={m} path={`/${m}`} element={<Placeholder />} />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
