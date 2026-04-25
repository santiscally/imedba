import {
  X, Receipt, UserCircle2, GraduationCap, Hash,
  CircleDollarSign, CreditCard, Calendar, FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Payment } from '../types/payment'
import { PAYMENT_METHOD_LABELS } from '../types/enrollment'
import './StudentDetail.scss'

interface Props {
  payment: Payment
  onClose: () => void
}

export default function PaymentDetail({ payment, onClose }: Props) {
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
              <Receipt size={28} strokeWidth={1.4} />
            </div>
            <div>
              <div className="detail__name">{payment.receiptNumber}</div>
              <div className="detail__meta">
                <span className="badge badge--activo">
                  {formatPrice(payment.amount)}
                </span>
                <span className="detail__moodle">
                  {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                </span>
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
              <Row icon={UserCircle2}
                label="Alumno"
                value={`${payment.enrollment.studentFirstName} ${payment.enrollment.studentLastName}`} />
              <Row icon={GraduationCap}
                label="Curso"
                value={payment.enrollment.courseName} />
              <Row icon={Hash}
                label="Cuota saldada"
                value={payment.installmentNumber != null
                  ? `#${payment.installmentNumber}`
                  : 'Pago suelto'} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Pago</h4>
            <dl className="detail__grid">
              <Row icon={CircleDollarSign} label="Monto"        value={formatPrice(payment.amount)} />
              <Row icon={CreditCard}       label="Medio"        value={PAYMENT_METHOD_LABELS[payment.paymentMethod]} />
              <Row icon={Calendar}         label="Fecha"        value={formatDate(payment.paymentDate)} />
              <Row icon={Receipt}          label="N° de recibo" value={payment.receiptNumber} mono />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Sistema</h4>
            <dl className="detail__grid">
              <Row icon={Hash}     label="ID"   value={payment.id} mono />
              <Row icon={Calendar} label="Alta" value={formatInstant(payment.createdAt)} />
            </dl>
          </section>

          {payment.notes && (
            <section className="detail__section">
              <h4 className="detail__section-title">
                <FileText size={14} strokeWidth={1.8} /> Observaciones
              </h4>
              <p className="detail__notes">{payment.notes}</p>
            </section>
          )}
        </div>

        <footer className="detail__footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cerrar
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

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1)
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatInstant(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
