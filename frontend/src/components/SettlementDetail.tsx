import {
  X, FileSpreadsheet, Calendar, Hash, GraduationCap,
  CircleDollarSign, Percent, Building2, University, Users,
  Mail, Check, RefreshCw, BadgeCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DiplomaSettlement } from '../types/diploma-settlement'
import { SETTLEMENT_STATUS_LABELS } from '../types/diploma-settlement'
import { hasAuthority } from '../lib/auth'
import './StudentDetail.scss'
import './SettlementDetail.scss'

interface Props {
  settlement: DiplomaSettlement
  onClose:    () => void
  onRecompute?: (s: DiplomaSettlement) => void
  onApprove?:   (s: DiplomaSettlement) => void
  onMarkPaid?:  (s: DiplomaSettlement) => void
}

const MONTHS = [
  'enero', 'febrero', 'marzo',     'abril',
  'mayo',  'junio',   'julio',     'agosto',
  'septiembre','octubre','noviembre','diciembre',
]

export default function SettlementDetail({
  settlement,
  onClose,
  onRecompute,
  onApprove,
  onMarkPaid,
}: Props) {
  const canWrite = hasAuthority('diplomas:write')
  const period = `${MONTHS[settlement.periodMonth - 1]} ${settlement.periodYear}`
  const isDraft    = settlement.status === 'DRAFT'
  const isApproved = settlement.status === 'APPROVED'
  const isPaid     = settlement.status === 'PAID'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="detail detail--lg"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="detail__header">
          <div className="detail__identity">
            <div className="detail__avatar">
              <FileSpreadsheet size={32} strokeWidth={1.4} />
            </div>
            <div>
              <div className="detail__name">Liquidación · {period}</div>
              <div className="detail__meta">
                <span className={`badge ${statusBadgeClass(settlement.status)}`}>
                  {SETTLEMENT_STATUS_LABELS[settlement.status]}
                </span>
                <span className="detail__moodle">{settlement.diplomaName}</span>
              </div>
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="detail__body">
          <section className="detail__section">
            <h4 className="detail__section-title">Resumen</h4>
            <dl className="detail__grid">
              <Row icon={GraduationCap} label="Diplomatura" value={settlement.diplomaName} />
              <Row icon={Calendar}      label="Período"     value={period} />
              <Row icon={CircleDollarSign} label="Total cobrado" value={formatPrice(settlement.totalCollected)} highlight />
            </dl>
          </section>

          {/* El orden espeja la planilla de IMEDBA: cada paso descuenta del anterior. */}
          <section className="detail__section">
            <h4 className="detail__section-title">1 · Impuestos y gastos bancarios</h4>
            <dl className="detail__grid">
              <Row icon={Percent} label="Impuestos"
                value={`− ${formatPrice(settlement.taxCommissionAmount)}`} />
              <Row icon={CircleDollarSign} label="Subtotal 1"
                value={formatPrice(settlement.subtotal1)} highlight />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">2 · Gastos administrativos</h4>
            <dl className="detail__grid">
              <Row icon={CircleDollarSign} label="Secretaría"
                value={`− ${formatPrice(settlement.secretaryAmount)}`} />
              <Row icon={CircleDollarSign} label="Publicidad"
                value={`− ${formatPrice(settlement.advertisingAmount)}`} />
              <Row icon={Building2} label="Administración"
                value={`− ${formatPrice(settlement.administrationAmount)}`} />
              <Row icon={CircleDollarSign} label="Gastos varios"
                value={`− ${formatPrice(settlement.miscExpensesAmount)}`} />
              <Row icon={CircleDollarSign} label="Subtotal 2"
                value={formatPrice(settlement.subtotal2)} highlight />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">3 · Reparto 50 / 50</h4>
            <dl className="detail__grid">
              <Row icon={CircleDollarSign} label="Cada mitad"
                value={formatPrice(settlement.halfAmount)} highlight />
              <Row icon={GraduationCap} label="Ganancia IMEDBA"
                value={formatPrice(settlement.imedbaAmount)} />
              <Row icon={University} label="Acumulado UNTREF"
                value={formatPrice(settlement.untrefAmount)} />
            </dl>
            <p className="detail__note">
              El acumulado de UNTREF no se paga este mes: se salda al cerrar la comisión.
            </p>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">
              <Users size={14} strokeWidth={1.8} />
              Directoras
              <span className="detail__sum">Total: {formatPrice(settlement.directorsBaseAmount)}</span>
            </h4>
            <dl className="detail__grid">
              <Row icon={CircleDollarSign} label="Mitad de directoras"
                value={formatPrice(settlement.halfAmount)} />
              <Row icon={CircleDollarSign} label="Grabaciones docentes"
                value={`− ${formatPrice(settlement.recordingsAmount)}`} />
            </dl>
            <div className="partners-table">
              {settlement.directorsDistribution.length === 0 ? (
                <div className="partners-table__empty">Sin directoras en esta liquidación.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th className="partners-table__amount">Monto</th>
                      <th>Email</th>
                      <th className="partners-table__paid">Pagada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlement.directorsDistribution.map((p, i) => (
                      <tr key={p.staffId ?? i}>
                        <td className="partners-table__name">{p.name}</td>
                        <td className="partners-table__amount">{formatPrice(p.amount)}</td>
                        <td className="partners-table__email">
                          {p.email
                            ? <span className="cell-inline"><Mail size={12} strokeWidth={1.8} />{p.email}</span>
                            : <span className="muted">—</span>}
                        </td>
                        <td className="partners-table__paid">
                          {p.paid
                            ? <span className="paid-yes"><Check size={14} strokeWidth={2.2} /></span>
                            : <span className="muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="partners-table__note">
                El campo <em>pagada</em> es informativo: hoy no persiste server-side.
                Cuando el backend lo soporte, se podrá tildar individualmente.
              </div>
            </div>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Sistema</h4>
            <dl className="detail__grid">
              <Row icon={Hash}     label="ID"             value={settlement.id} mono />
              <Row icon={Calendar} label="Alta"           value={formatInstant(settlement.createdAt)} />
              <Row icon={Calendar} label="Última edición" value={formatInstant(settlement.updatedAt)} />
            </dl>
          </section>
        </div>

        <footer className="detail__footer detail__footer--sm">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          {canWrite && isDraft && onRecompute && (
            <button type="button" className="btn-ghost" onClick={() => onRecompute(settlement)}>
              <RefreshCw size={15} /> Recomputar
            </button>
          )}
          {canWrite && isDraft && onApprove && (
            <button type="button" className="btn-primary" onClick={() => onApprove(settlement)}>
              <BadgeCheck size={15} /> Aprobar
            </button>
          )}
          {canWrite && isApproved && onMarkPaid && (
            <button type="button" className="btn-primary" onClick={() => onMarkPaid(settlement)}>
              <CircleDollarSign size={15} /> Marcar pagada
            </button>
          )}
          {isPaid && (
            <span className="detail__locked">
              <Check size={14} strokeWidth={2.2} /> Liquidación cerrada
            </span>
          )}
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
  highlight?: boolean
}) {
  const Icon = props.icon
  return (
    <div className={`detail__row ${props.highlight ? 'detail__row--hl' : ''}`}>
      <div className="detail__row-label">
        <Icon size={14} strokeWidth={1.8} /> {props.label}
      </div>
      <div className={`detail__row-value ${props.mono ? 'mono' : ''}`}>
        {props.value ?? <span className="detail__empty">—</span>}
      </div>
    </div>
  )
}

function statusBadgeClass(s: DiplomaSettlement['status']): string {
  switch (s) {
    case 'DRAFT':    return 'badge--pendiente'
    case 'APPROVED': return 'badge--suspendida'
    case 'PAID':     return 'badge--activo'
  }
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)
}

function formatInstant(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
