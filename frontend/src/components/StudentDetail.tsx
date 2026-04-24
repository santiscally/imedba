import {
  X, Pencil, UserCircle2, Mail, Phone, IdCard, Flag,
  GraduationCap, MapPin, Hash, Calendar, FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Student } from '../types/student'
import './StudentDetail.scss'

interface Props {
  student: Student
  onClose: () => void
  onEdit:  () => void
}

export default function StudentDetail({ student, onClose, onEdit }: Props) {
  const fullName = `${student.firstName} ${student.lastName}`

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
              <UserCircle2 size={44} strokeWidth={1.3} />
            </div>
            <div>
              <div className="detail__name">{fullName}</div>
              <div className="detail__meta">
                <span className={`badge ${student.active ? 'badge--activo' : 'badge--inactivo'}`}>
                  {student.active ? 'Activo' : 'Inactivo'}
                </span>
                {student.moodleUserId != null && (
                  <span className="detail__moodle">
                    Moodle ID {student.moodleUserId}
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
            <h4 className="detail__section-title">Contacto</h4>
            <dl className="detail__grid">
              <Row icon={Mail}  label="Email"    value={student.email} />
              <Row icon={Phone} label="Teléfono" value={student.phone} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Datos personales</h4>
            <dl className="detail__grid">
              <Row icon={IdCard}        label="DNI"          value={student.dni} />
              <Row icon={Flag}          label="Nacionalidad" value={student.nationality} />
              <Row icon={GraduationCap} label="Universidad"  value={student.university} />
              <Row icon={MapPin}        label="Localidad"    value={student.locality} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Sistema</h4>
            <dl className="detail__grid">
              <Row icon={Hash}     label="ID"            value={student.id} mono />
              <Row icon={Calendar} label="Alta"          value={formatDate(student.createdAt)} />
              <Row icon={Calendar} label="Última edición" value={formatDate(student.updatedAt)} />
            </dl>
          </section>

          {student.notes && (
            <section className="detail__section">
              <h4 className="detail__section-title">
                <FileText size={14} strokeWidth={1.8} /> Observaciones
              </h4>
              <p className="detail__notes">{student.notes}</p>
            </section>
          )}
        </div>

        <footer className="detail__footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="btn-primary" onClick={onEdit}>
            <Pencil size={15} /> Editar alumno
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

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
