import {
  X, Pencil, TicketPercent, Layers, Percent,
  CalendarDays, CalendarClock, Hash, Calendar, FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DiscountCampaign } from '../types/discount-campaign'
import { DISCOUNT_TYPE_LABELS } from '../types/discount-campaign'
import './StudentDetail.scss'

interface Props {
  campaign: DiscountCampaign
  onClose:  () => void
  onEdit:   () => void
}

export default function DiscountCampaignDetail({ campaign, onClose, onEdit }: Props) {
  const valueLabel = campaign.discountType === 'PERCENTAGE'
    ? `${campaign.value}%`
    : formatPrice(campaign.value) ?? '—'

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
              <TicketPercent size={32} strokeWidth={1.4} />
            </div>
            <div>
              <div className="detail__name">{campaign.name}</div>
              <div className="detail__meta">
                <span className={`badge ${campaign.active ? 'badge--activo' : 'badge--inactivo'}`}>
                  {campaign.active ? 'Activa' : 'Inactiva'}
                </span>
                <span className="detail__moodle">{valueLabel}</span>
              </div>
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="detail__body">
          <section className="detail__section">
            <h4 className="detail__section-title">Descuento</h4>
            <dl className="detail__grid">
              <Row icon={Layers}  label="Tipo"  value={DISCOUNT_TYPE_LABELS[campaign.discountType]} />
              <Row icon={Percent} label="Valor" value={valueLabel} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Vigencia</h4>
            <dl className="detail__grid">
              <Row icon={CalendarDays}  label="Vigente desde" value={formatLocalDate(campaign.validFrom)} />
              <Row icon={CalendarClock} label="Vigente hasta" value={formatLocalDate(campaign.validTo)} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Sistema</h4>
            <dl className="detail__grid">
              <Row icon={Hash}     label="ID"             value={campaign.id} mono />
              <Row icon={Calendar} label="Alta"           value={formatInstant(campaign.createdAt)} />
              <Row icon={Calendar} label="Última edición" value={formatInstant(campaign.updatedAt)} />
            </dl>
          </section>

          {campaign.description && (
            <section className="detail__section">
              <h4 className="detail__section-title">
                <FileText size={14} strokeWidth={1.8} /> Descripción
              </h4>
              <p className="detail__notes">{campaign.description}</p>
            </section>
          )}
        </div>

        <footer className="detail__footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="btn-primary" onClick={onEdit}>
            <Pencil size={15} /> Editar campaña
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
