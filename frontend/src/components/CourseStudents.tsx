import { useEffect, useState } from 'react'
import { X, Users, UserCircle2, Mail, CalendarDays } from 'lucide-react'
import { enrollmentsApi } from '../api/enrollments'
import type { Enrollment, EnrollmentStatus } from '../types/enrollment'
import { ENROLLMENT_STATUS_LABELS } from '../types/enrollment'
import './StudentDetail.scss'
import './CourseStudents.scss'

function statusBadgeClass(s: EnrollmentStatus): string {
  switch (s) {
    case 'ACTIVE':    return 'badge--activo'
    case 'SUSPENDED': return 'badge--pendiente'
    case 'COMPLETED': return 'badge--activo'
    case 'CANCELLED': return 'badge--inactivo'
  }
}

// Lista de alumnos inscriptos en un curso. Reutilizable: va dentro del detalle
// del curso y dentro del modal directo desde la tabla.
export function CourseStudentsList({ courseId }: { courseId: string }) {
  const [items,   setItems]   = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    enrollmentsApi.list({ courseId, size: 500 })
      .then(res => {
        const sorted = [...res.content].sort((a, b) =>
          a.student.lastName.localeCompare(b.student.lastName, 'es'))
        setItems(sorted)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [courseId])

  if (loading) return <div className="course-students__state">Cargando alumnos…</div>
  if (error)   return <div className="course-students__state course-students__state--error">{error}</div>
  if (items.length === 0)
    return <div className="course-students__state">Este curso no tiene alumnos inscriptos.</div>

  return (
    <ul className="course-students__list">
      {items.map(e => (
        <li key={e.id} className="course-students__item">
          <div className="course-students__avatar">
            <UserCircle2 size={24} strokeWidth={1.4} />
          </div>
          <div className="course-students__main">
            <div className="course-students__name">
              {e.student.lastName}, {e.student.firstName}
            </div>
            <div className="course-students__sub">
              <Mail size={12} strokeWidth={1.8} /> {e.student.email}
            </div>
          </div>
          <div className="course-students__meta">
            <span className="course-students__date">
              <CalendarDays size={12} strokeWidth={1.8} /> {formatInstantDate(e.enrollmentDate)}
            </span>
            <span className={`badge ${statusBadgeClass(e.status)}`}>
              {ENROLLMENT_STATUS_LABELS[e.status]}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

// Modal directo desde la fila de la tabla de cursos.
export default function CourseStudents({
  courseId, courseName, onClose,
}: {
  courseId:   string
  courseName: string
  onClose:    () => void
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="detail__header">
          <div className="detail__identity">
            <div className="detail__avatar">
              <Users size={28} strokeWidth={1.4} />
            </div>
            <div>
              <div className="detail__name">Alumnos inscriptos</div>
              <div className="detail__meta">
                <span className="detail__moodle">{courseName}</span>
              </div>
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="detail__body">
          <CourseStudentsList courseId={courseId} />
        </div>

        <footer className="detail__footer">
          <button type="button" className="btn-ghost" onClick={onClose}>Cerrar</button>
        </footer>
      </div>
    </div>
  )
}

function formatInstantDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
