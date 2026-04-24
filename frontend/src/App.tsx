import { Routes, Route, Navigate } from 'react-router-dom'
import Login       from './pages/Login'
import Layout      from './components/Layout'
import Dashboard   from './pages/Dashboard'
import Alumnos     from './pages/Alumnos'
import Cursos      from './pages/Cursos'
import Placeholder from './pages/Placeholder'

const MODULES = [
  'inscripciones',
  'cuotas', 'descuentos', 'diplomaturas', 'liquidaciones', 'presupuesto',
  'libros', 'ventas', 'autores',
  'personal', 'horas', 'contactos', 'notificaciones',
]

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alumnos"   element={<Alumnos />} />
        <Route path="/cursos"    element={<Cursos />} />
        {MODULES.map(m => (
          <Route key={m} path={`/${m}`} element={<Placeholder />} />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
