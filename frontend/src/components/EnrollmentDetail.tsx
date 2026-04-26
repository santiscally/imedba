import {
  X, Pencil, FileText, UserCircle2, GraduationCap,
  CircleDollarSign, Percent, Book, Wallet, CreditCard, Hash,
  Calendar, PauseCircle, XCircle, Play,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Enrollment, EnrollmentStatus } from '../types/enrollment'
import { ENROLLMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '../types/enrollment'
import './StudentDetail.scss'

interface Props {
  en:          Enrollment
  onClose:     () => void
  onEdit:      () => void
  onSuspend?:  () => void
  onReactivate?: () => void
  onCancel?:   () => void
}

export default function EnrollmentDetail({
  en, onClose, onEdit, onSuspend, onReactivate, onCancel,
}: Props) {
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
              <FileText size={28} strokeWidth={1.4} />
            </div>
            <div>
              <div className="detail__name">
                {en.student.firstName} {en.student.lastName}
              </div>
              <div className="detail__meta">
                <span className={`badge ${statusBadgeClass(en.status)}`}>
                  {ENROLLMENT_STATUS_LABELS[en.status]}
                </span>
                {en.moodleStatus && (
                  <span className="detail__moodle">Moodle: {en.moodleStatus}</span>
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
            <h4 className="detail__section-title">Alumno y curso</h4>
            <dl className="detail__grid">
              <Row icon={UserCircle2}   label="Alumno" value={`${en.student.firstName} ${en.student.lastName}`} />
              <Row icon={GraduationCap} label="Curso"  value={en.course.name} />
              <Row icon={Hash}          label="Código curso" value={en.course.code} mono />
              <Row icon={Calendar}      label="Fecha inscripción" value={formatInstant(en.enrollmentDate)} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Finanzas</h4>
            <dl className="detail__grid">
              <Row icon={CircleDollarSign} label="Precio de lista" value={formatPrice(en.listPrice)} />
              <Row icon={Percent}          label="Descuento"       value={formatPct(en.discountPercentage)} />
              <Row icon={CircleDollarSign} label="Precio final"    value={formatPrice(en.finalPrice)} />
              <Row icon={Book}             label="Libro"           value={formatPrice(en.bookPrice)} />
              <Row icon={Wallet}           label="Total"           value={formatPrice(en.totalPrice)} />
              <Row icon={CircleDollarSign} label="Matrícula"       value={formatPrice(en.enrollmentFee)} />
              <Row icon={Hash}             label="Cuotas"          value={en.numInstallments?.toString() ?? null} />
              <Row icon={CreditCard}       label="Medio de pago"
                   value={en.paymentMethod ? PAYMENT_METHOD_LABELS[en.paymentMethod] : null} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Contrato</h4>
            <dl className="detail__grid">
              <Row icon={Calendar} label="Enviado" value={formatInstant(en.contractSentAt)} />
              <Row icon={Calendar} label="Firmado" value={formatInstant(en.contractSignedAt)} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Sistema</h4>
            <dl className="detail__grid">
              <Row icon={Hash}     label="ID"             value={en.id} mono />
              <Row icon={Calendar} label="Alta"           value={formatInstant(en.createdAt)} />
              <Row icon={Calendar} label="Última edición" value={formatInstant(en.updatedAt)} />
            </dl>
          </section>

          {en.notes && (
            <section className="detail__section">
              <h4 className="detail__section-title">
                <FileText size={14} strokeWidth={1.8} /> Observaciones
              </h4>
              <p className="detail__notes">{en.notes}</p>
            </section>
          )}
        </div>

        <footer className="detail__footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          {en.status === 'ACTIVE' && onSuspend && (
            <button type="button" className="btn-ghost" onClick={onSuspend}>
              <PauseCircle size={15} /> Suspender
            </button>
          )}
          {en.status === 'SUSPENDED' && onReactivate && (
            <button type="button" className="btn-ghost" onClick={onReactivate}>
              <Play size={15} /> Reactivar
            </button>
          )}
          {(en.status === 'ACTIVE' || en.status === 'SUSPENDED') && onCancel && (
            <button type="button" className="btn-ghost" onClick={onCancel}>
              <XCircle size={15} /> Cancelar
            </button>
          )}
          <button type="button" className="btn-primary" onClick={onEdit}>
            <Pencil size={15} /> Editar
          </button>
        </footer>
      </div>
    </div>
  )
}

function statusBadgeClass(s: EnrollmentStatus): string {
  switch (s) {
    case 'ACTIVE':    return 'badge--activo'
    case 'COMPLETED': return 'badge--completada'
    case 'SUSPENDED': return 'badge--suspendida'
    case 'CANCELLED': return 'badge--inactivo'
  }
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
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)
}

function formatPct(n: number | null | undefined): string | null {
  if (n == null) return null
  return `${n}%`
}

function formatInstant(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
