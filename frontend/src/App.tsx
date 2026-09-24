import { Routes, Route, Navigate } from 'react-router-dom'
import Login         from './pages/Login'
import AuthCallback  from './pages/AuthCallback'
import Layout        from './components/Layout'
import RequireAuth   from './components/RequireAuth'
import Dashboard     from './pages/Dashboard'
import Alumnos       from './pages/Alumnos'
import Cursos        from './pages/Cursos'
import Inscripciones from './pages/Inscripciones'
import Cuotas        from './pages/Cuotas'
import Descuentos    from './pages/Descuentos'
import Diplomaturas  from './pages/Diplomaturas'
import Liquidaciones from './pages/Liquidaciones'
import Presupuesto   from './pages/Presupuesto'
import Autores       from './pages/Autores'
import Libros        from './pages/Libros'
import Ventas        from './pages/Ventas'
import Colecciones   from './pages/Colecciones'
import Personal      from './pages/Personal'
import PersonalAcademico from './pages/PersonalAcademico'
import Clases        from './pages/Clases'

export default function App() {
  return (
    <Routes>
      <Route path="/"              element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/dashboard"     element={<Dashboard />} />
        <Route path="/rm/alumnos"       element={<Alumnos key="rm" unit="RESIDENCIAS" />} />
        <Route path="/rm/cursos"        element={<Cursos />} />
        <Route path="/rm/inscripciones" element={<Inscripciones key="rm" unit="RESIDENCIAS" />} />
        <Route path="/fs/alumnos"       element={<Alumnos key="fs" unit="FORMACION_SUPERIOR" />} />
        <Route path="/fs/diplomaturas"  element={<Diplomaturas />} />
        <Route path="/fs/inscripciones" element={<Inscripciones key="fs" unit="FORMACION_SUPERIOR" />} />
        <Route path="/alumnos"          element={<Navigate to="/rm/alumnos" replace />} />
        <Route path="/cursos"           element={<Navigate to="/rm/cursos" replace />} />
        <Route path="/inscripciones"    element={<Navigate to="/rm/inscripciones" replace />} />
        <Route path="/diplomaturas"     element={<Navigate to="/fs/diplomaturas" replace />} />
        <Route path="/personal-academico" element={<PersonalAcademico />} />
        <Route path="/clases"        element={<Clases />} />
        <Route path="/cuotas"        element={<Cuotas />} />
        <Route path="/descuentos"    element={<Descuentos />} />
        <Route path="/liquidaciones" element={<Liquidaciones />} />
        <Route path="/presupuesto"   element={<Presupuesto />} />
        <Route path="/autores"       element={<Autores />} />
        <Route path="/libros"        element={<Libros />} />
        <Route path="/ventas"        element={<Ventas />} />
        <Route path="/colecciones"   element={<Colecciones />} />
        <Route path="/personal"      element={<Personal />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
