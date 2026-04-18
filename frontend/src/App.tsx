import { Routes, Route, Navigate } from 'react-router-dom'
import Login       from './pages/Login'
import Layout      from './components/Layout'
import Dashboard   from './pages/Dashboard'
import Placeholder from './pages/Placeholder'

const MODULES = [
  'alumnos', 'cursos', 'inscripciones',
  'cuotas', 'descuentos', 'presupuesto',
  'libros', 'ventas', 'autores',
  'diplomas', 'liquidaciones',
  'personal', 'horas', 'contactos', 'notificaciones',
]

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        {MODULES.map(m => (
          <Route key={m} path={`/${m}`} element={<Placeholder />} />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
