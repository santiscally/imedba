import {
  X, Pencil, GraduationCap, University, FileText,
  CircleDollarSign, Hash, Calendar, Mail,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Diploma } from '../types/diploma'
import { hasAuthority } from '../lib/auth'
import './StudentDetail.scss'
import './DiplomaDetail.scss'

interface Props {
  diploma: Diploma
  onClose: () => void
  onEdit:  () => void
}

export default function DiplomaDetail({ diploma, onClose, onEdit }: Props) {
  const canWrite = hasAuthority('diplomas:write')
  // Desde V035 la diplomatura no tiene costos ni porcentajes: sólo quiénes son las
  // directoras. Todo lo demás se carga al liquidar.
  const directors = diploma.directors ?? []

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
              <GraduationCap size={32} strokeWidth={1.4} />
            </div>
            <div>
              <div className="detail__name">{diploma.name}</div>
              <div className="detail__meta">
                {diploma.universityName && (
                  <span className="detail__moodle">{diploma.universityName}</span>
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
            <h4 className="detail__section-title">Identificación</h4>
            <dl className="detail__grid">
              <Row icon={University}    label="Universidad"           value={diploma.universityName} />
              <Row icon={GraduationCap} label="Curso (inscripciones)" value={diploma.courseName} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Precios</h4>
            <dl className="detail__grid">
              <Row icon={CircleDollarSign} label="Matrícula"     value={formatPrice(diploma.enrollmentPrice)} />
              <Row icon={CircleDollarSign} label="Precio curso"  value={formatPrice(diploma.coursePrice)} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">
              Directoras
              <span className="detail__sum">{directors.length}</span>
            </h4>
            <div className="partners-table">
              {directors.length === 0 ? (
                <div className="partners-table__empty">Sin directoras configuradas.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directors.map(p => (
                      <tr key={p.id}>
                        <td className="partners-table__name">{p.name}</td>
                        <td className="partners-table__email">
                          {p.email
                            ? <span className="cell-inline"><Mail size={12} strokeWidth={1.8} />{p.email}</span>
                            : <span className="muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="detail__note">
              Se reparten en partes iguales la mitad del subtotal menos las grabaciones.
              Los costos y porcentajes se cargan al liquidar, no acá.
            </p>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Sistema</h4>
            <dl className="detail__grid">
              <Row icon={Hash}     label="ID"             value={diploma.id} mono />
              <Row icon={Calendar} label="Alta"           value={formatInstant(diploma.createdAt)} />
              <Row icon={Calendar} label="Última edición" value={formatInstant(diploma.updatedAt)} />
            </dl>
          </section>

          {diploma.description && (
            <section className="detail__section">
              <h4 className="detail__section-title">
                <FileText size={14} strokeWidth={1.8} /> Descripción
              </h4>
              <p className="detail__notes">{diploma.description}</p>
            </section>
          )}
        </div>

        <footer className="detail__footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          {canWrite && (
            <button type="button" className="btn-primary" onClick={onEdit}>
              <Pencil size={15} /> Editar diplomatura
            </button>
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

function formatInstant(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
