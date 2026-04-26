import {
  X, Receipt, CalendarDays, CircleDollarSign, Tag, Layers,
  Building2, CreditCard, RotateCcw, Banknote, Hash, Calendar, FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { BudgetEntry } from '../types/budget'
import {
  ENTRY_TYPE_LABELS, BUDGET_CATEGORY_LABELS, BUDGET_BUSINESS_UNIT_LABELS,
} from '../types/budget'
import { PAYMENT_METHOD_LABELS } from '../types/enrollment'
import './StudentDetail.scss'

interface Props {
  entry:   BudgetEntry
  onClose: () => void
}

export default function BudgetEntryDetail({ entry, onClose }: Props) {
  const isIncome = entry.entryType === 'INCOME'

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
              <Receipt size={32} strokeWidth={1.4} />
            </div>
            <div>
              <div className="detail__name">{entry.concept}</div>
              <div className="detail__meta">
                <span className={`badge ${isIncome ? 'badge--activo' : 'badge--inactivo'}`}>
                  {ENTRY_TYPE_LABELS[entry.entryType]}
                </span>
                {entry.projected && (
                  <span className="badge badge--suspendida">Proyectado</span>
                )}
                <span className="detail__moodle">{formatPrice(entry.amount)}</span>
              </div>
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="detail__body">
          <section className="detail__section">
            <h4 className="detail__section-title">Clasificación</h4>
            <dl className="detail__grid">
              <Row icon={Tag}        label="Categoría"     value={BUDGET_CATEGORY_LABELS[entry.category]} />
              <Row icon={Layers}     label="Subcategoría"  value={entry.subcategory} />
              <Row icon={Building2}  label="Unidad"        value={entry.businessUnit ? BUDGET_BUSINESS_UNIT_LABELS[entry.businessUnit] : null} />
              <Row icon={CalendarDays} label="Fecha"       value={formatLocalDate(entry.entryDate)} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Pago</h4>
            <dl className="detail__grid">
              <Row icon={CircleDollarSign} label="Monto"          value={formatPrice(entry.amount)} />
              <Row icon={CreditCard}       label="Método"         value={entry.paymentMethod ? PAYMENT_METHOD_LABELS[entry.paymentMethod] : null} />
              <Row icon={Hash}             label="N° referencia"  value={entry.referenceNumber} mono />
              <Row icon={Banknote}         label="En efectivo"    value={boolLabel(entry.cash)} />
              <Row icon={RotateCcw}        label="Recurrente"     value={boolLabel(entry.recurring)} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Sistema</h4>
            <dl className="detail__grid">
              <Row icon={Hash}     label="ID"             value={entry.id} mono />
              <Row icon={Calendar} label="Alta"           value={formatInstant(entry.createdAt)} />
              <Row icon={Calendar} label="Última edición" value={formatInstant(entry.updatedAt)} />
            </dl>
            {(entry.paymentId || entry.bookSaleId || entry.enrollmentId) && (
              <div className="detail__notes">
                <strong>Origen:</strong>{' '}
                {entry.paymentId    && 'auto-creado desde pago'}
                {entry.bookSaleId   && 'auto-creado desde venta de libro'}
                {entry.enrollmentId && !entry.paymentId && 'auto-creado desde inscripción'}
              </div>
            )}
          </section>

          {entry.notes && (
            <section className="detail__section">
              <h4 className="detail__section-title">
                <FileText size={14} strokeWidth={1.8} /> Notas
              </h4>
              <p className="detail__notes">{entry.notes}</p>
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

function boolLabel(v: boolean | null | undefined): string | null {
  if (v == null) return null
  return v ? 'Sí' : 'No'
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
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
