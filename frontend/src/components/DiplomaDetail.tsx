import { useState } from 'react'
import {
  X, Pencil, GraduationCap, University, FileText,
  Hash, Calendar, Mail, Plus, Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Commission, Diploma } from '../types/diploma'
import { diplomasApi } from '../api/diplomas'
import { hasAuthority } from '../lib/auth'
import { confirmAction, alertError, toastSuccess } from '../lib/confirm'
import CommissionForm from './CommissionForm'
import './StudentDetail.scss'
import './DiplomaDetail.scss'

interface Props {
  diploma:    Diploma
  onClose:    () => void
  onEdit:     (current: Diploma) => void
  onChanged?: () => void
}

type CommissionPanel = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; commission: Commission }

export default function DiplomaDetail({ diploma: initial, onClose, onEdit, onChanged }: Props) {
  const canWrite = hasAuthority('diplomas:write')
  const [diploma, setDiploma] = useState<Diploma>(initial)
  const [panel,   setPanel]   = useState<CommissionPanel>({ kind: 'closed' })

  async function refresh() {
    setPanel({ kind: 'closed' })
    try {
      setDiploma(await diplomasApi.get(diploma.id))
    } catch (err) {
      alertError('No se pudo recargar la diplomatura', err instanceof Error ? err.message : undefined)
    }
    onChanged?.()
  }

  async function handleDelete(c: Commission) {
    const ok = await confirmAction({
      title: `¿Eliminar la comisión ${c.commission ?? 'sin número'}?`,
      text: 'Si tiene inscripciones no se puede eliminar: en ese caso, desactivala editándola.',
      icon: 'warning', danger: true, confirmText: 'Sí, eliminar',
    })
    if (!ok) return
    try {
      await diplomasApi.removeCommission(diploma.id, c.id)
      toastSuccess('Comisión eliminada')
      await refresh()
    } catch (err) {
      alertError('No se pudo eliminar', err instanceof Error ? err.message : undefined)
    }
  }

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
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">
              Comisiones
              <span className="detail__sum">{diploma.commissions.length}</span>
              {canWrite && (
                <button type="button" className="btn-ghost btn-ghost--sm" style={{ marginLeft: 'auto' }}
                  onClick={() => setPanel({ kind: 'create' })}>
                  <Plus size={14} /> Nueva comisión
                </button>
              )}
            </h4>
            <div className="partners-table">
              {diploma.commissions.length === 0 ? (
                <div className="partners-table__empty">
                  Sin comisiones: los alumnos se inscriben a una comisión, así que hace falta al menos una.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Comisión</th>
                      <th>Inicio – cierre</th>
                      <th>Matrícula</th>
                      <th>Curso</th>
                      <th>Libro</th>
                      {canWrite && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {diploma.commissions.map(c => (
                      <tr key={c.id} className={c.active === false ? 'muted' : undefined}>
                        <td className="partners-table__name">
                          {c.commission != null ? `Com. ${c.commission}` : 'Sin número'}
                          {c.academicYear != null ? ` · ${c.academicYear}` : ''}
                          {c.active === false && <span className="muted"> (inactiva)</span>}
                        </td>
                        <td>{formatDay(c.startDate)} – {formatDay(c.endDate)}</td>
                        <td>{formatPrice(c.enrollmentPrice) ?? '—'}</td>
                        <td>{formatPrice(c.coursePrice) ?? '—'}</td>
                        <td>{c.includesPremaBook ? 'PREMA' : '—'}</td>
                        {canWrite && (
                          <td>
                            <div className="row-actions">
                              <button type="button" className="row-actions__btn" aria-label="Editar comisión"
                                onClick={() => setPanel({ kind: 'edit', commission: c })}>
                                <Pencil size={14} />
                              </button>
                              <button type="button" className="row-actions__btn row-actions__btn--danger"
                                aria-label="Eliminar comisión" onClick={() => handleDelete(c)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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
            <button type="button" className="btn-primary" onClick={() => onEdit(diploma)}>
              <Pencil size={15} /> Editar diplomatura
            </button>
          )}
        </footer>
      </div>

      {panel.kind !== 'closed' && (
        // Frena el click para que cerrar el modal de la comisión no cierre también el detalle.
        <div onClick={e => e.stopPropagation()}>
        <CommissionForm
          diplomaName={diploma.name}
          initial={panel.kind === 'edit' ? panel.commission : undefined}
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={() => {
            toastSuccess(panel.kind === 'edit' ? 'Comisión actualizada' : 'Comisión creada')
            void refresh()
          }}
          onSubmit={payload => panel.kind === 'edit'
            ? diplomasApi.updateCommission(diploma.id, panel.commission.id, payload)
            : diplomasApi.createCommission(diploma.id, payload)}
        />
        </div>
      )}
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

function formatDay(iso: string | null): string {
  if (!iso) return '?'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
