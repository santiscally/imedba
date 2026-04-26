import { Routes, Route, Navigate } from 'react-router-dom'
import Login         from './pages/Login'
import Layout        from './components/Layout'
import Dashboard     from './pages/Dashboard'
import Alumnos       from './pages/Alumnos'
import Cursos        from './pages/Cursos'
import Inscripciones from './pages/Inscripciones'
import Cuotas        from './pages/Cuotas'
import Placeholder   from './pages/Placeholder'

const MODULES = [
  'descuentos', 'diplomaturas', 'liquidaciones', 'presupuesto',
  'libros', 'ventas', 'autores',
  'personal', 'horas', 'contactos', 'notificaciones',
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
        {MODULES.map(m => (
          <Route key={m} path={`/${m}`} element={<Placeholder />} />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
