import {
  X, Pencil, GraduationCap, Tag, Layers, Building2,
  CalendarDays, CircleDollarSign, Hash, Calendar, FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Course } from '../types/course'
import { BUSINESS_UNIT_LABELS } from '../types/course'
import './StudentDetail.scss'

interface Props {
  course:  Course
  onClose: () => void
  onEdit:  () => void
}

export default function CourseDetail({ course, onClose, onEdit }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="detail"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="detail__header">
          <div className="detail__identity">
            <div className="detail__avatar">
              <GraduationCap size={32} strokeWidth={1.4} />
            </div>
            <div>
              <div className="detail__name">{course.name}</div>
              <div className="detail__meta">
                <span className={`badge ${course.active ? 'badge--activo' : 'badge--inactivo'}`}>
                  {course.active ? 'Activo' : 'Inactivo'}
                </span>
                {course.moodleCourseId != null && (
                  <span className="detail__moodle">
                    Moodle ID {course.moodleCourseId}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="detail__body">
          <section className="detail__section">
            <h4 className="detail__section-title">Catálogo</h4>
            <dl className="detail__grid">
              <Row icon={Tag}         label="Código"            value={course.code} mono />
              <Row icon={Layers}      label="Modalidad"         value={course.modality} />
              <Row icon={Building2}   label="Unidad de negocio" value={BUSINESS_UNIT_LABELS[course.businessUnit]} />
              <Row icon={CalendarDays} label="Fecha de examen"  value={formatLocalDate(course.examDate)} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Precios</h4>
            <dl className="detail__grid">
              <Row icon={CircleDollarSign} label="Matrícula" value={formatPrice(course.enrollmentPrice)} />
              <Row icon={CircleDollarSign} label="Curso"     value={formatPrice(course.coursePrice)} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Sistema</h4>
            <dl className="detail__grid">
              <Row icon={Hash}     label="ID"             value={course.id} mono />
              <Row icon={Calendar} label="Alta"           value={formatInstant(course.createdAt)} />
              <Row icon={Calendar} label="Última edición" value={formatInstant(course.updatedAt)} />
            </dl>
          </section>

          {course.description && (
            <section className="detail__section">
              <h4 className="detail__section-title">
                <FileText size={14} strokeWidth={1.8} /> Descripción
              </h4>
              <p className="detail__notes">{course.description}</p>
            </section>
          )}
        </div>

        <footer className="detail__footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="btn-primary" onClick={onEdit}>
            <Pencil size={15} /> Editar curso
          </button>
        </footer>
      </div>
    </div>
  )
}

function Row(props: {
  icon:  LucideIcon
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  const Icon = props.icon
  return (
    <div className="detail__row">
      <div className="detail__row-label">
        <Icon size={14} strokeWidth={1.8} /> {props.label}
      </div>
      <div className={`detail__row-value ${props.mono ? 'mono' : ''}`}>
        {props.value ?? <span className="detail__empty">—</span>}
      </div>
    </div>
  )
}

function formatPrice(n: number | null | undefined): string | null {
  if (n == null) return null
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatLocalDate(iso: string | null): string | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1)
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatInstant(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
