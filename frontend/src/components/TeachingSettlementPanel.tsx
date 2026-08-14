import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Calculator, Check, CircleDollarSign, Clock, Download, Info, Mail, RefreshCw, Save } from 'lucide-react'
import { teachingApi } from '../api/teaching'
import type {
  TeachingCandidate, TeachingSettlement, TeachingSettlementSummary,
} from '../types/teaching'
import {
  TEACHING_ROLE_LABELS, TEACHING_STATUS_LABELS, formatHours,
} from '../types/teaching'
import EmptyState from './EmptyState'
import { confirmAction, alertError, toastSuccess } from '../lib/confirm'
import { exportToCsv, dateStamp } from '../lib/exportCsv'
import { hasAuthority } from '../lib/auth'
import '../pages/SalesCommission.scss'
import '../pages/TeachingSettlement.scss'

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/**
 * Liquidación de horas docentes y de preceptoría (doc 17 §3.2).
 *
 * Se deriva de la grilla de clases: nadie carga totales a mano. La lista de
 * candidatas sale de quién dio o acompañó clases sincrónicas en el mes.
 */
export default function TeachingSettlementPanel() {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [year,  setYear]  = useState(prev.getFullYear())
  const [month, setMonth] = useState(prev.getMonth() + 1)

  const [candidates, setCandidates] = useState<TeachingCandidate[] | null>(null)
  const [settlements, setSettlements] = useState<TeachingSettlementSummary[]>([])
  const [selected, setSelected] = useState<TeachingCandidate | null>(null)
  const [preview, setPreview] = useState<TeachingSettlement | null>(null)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [reload,  setReload]  = useState(0)

  const canWrite = hasAuthority('settlements:write')

  useEffect(() => {
    setSelected(null); setPreview(null); setCandidates(null)
    Promise.all([
      teachingApi.candidates(year, month),
      teachingApi.listSettlements(year, month),
    ])
      .then(([c, s]) => { setCandidates(c); setSettlements(s) })
      .catch((err: Error) => { setCandidates([]); setError(err.message) })
  }, [year, month, reload])

  useEffect(() => {
    if (!selected) { setPreview(null); return }
    setLoading(true); setError(null)
    teachingApi.preview(selected.staffId, selected.role, year, month)
      .then(p => { setPreview(p); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [selected, year, month, reload])

  const settledFor = useMemo(() => {
    if (!selected) return null
    return settlements.find(
      s => s.staffId === selected.staffId && s.role === selected.role) ?? null
  }, [settlements, selected])

  async function handleCreate() {
    if (!preview || !selected) return
    const ok = await confirmAction({
      title: '¿Generar la liquidación?',
      text: `${selected.staffName} — ${TEACHING_ROLE_LABELS[selected.role]}, `
          + `${MONTHS[month - 1]} ${year}: ${formatPrice(preview.totalAmount)}. `
          + 'Queda como borrador.',
      icon: 'question',
      confirmText: 'Sí, generar',
    })
    if (!ok) return
    setSaving(true)
    try {
      await teachingApi.createSettlement({
        staffId: selected.staffId, role: selected.role,
        periodMonth: month, periodYear: year,
      })
      toastSuccess('Liquidación generada')
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudo generar', err instanceof Error ? err.message : undefined)
    } finally { setSaving(false) }
  }

  async function handleAction(
    id: string,
    action: 'recompute' | 'approve' | 'invoice-sent' | 'invoice-received' | 'mark-paid',
  ) {
    const meta: Record<typeof action, { title: string; done: string; text: string }> = {
      'recompute':        { title: '¿Recalcular?', done: 'Recalculada',
                            text: 'Vuelve a leer las clases del período.' },
      'approve':          { title: '¿Aprobar?', done: 'Aprobada',
                            text: 'Después de aprobar se le pide la factura.' },
      'invoice-sent':     { title: '¿Marcar que se pidió la factura?', done: 'Marcado',
                            text: 'Registra que ya se le mandó el mail.' },
      'invoice-received': { title: '¿Factura recibida?', done: 'Factura registrada',
                            text: 'Habilita marcar el pago.' },
      'mark-paid':        { title: '¿Marcar como pagada?', done: 'Marcada como pagada',
                            text: 'Esta acción no se puede deshacer.' },
    }
    const m = meta[action]
    const ok = await confirmAction({
      title: m.title, text: m.text,
      icon: action === 'mark-paid' ? 'warning' : 'question',
      confirmText: 'Sí, continuar',
    })
    if (!ok) return
    try {
      if (action === 'recompute')             await teachingApi.recompute(id)
      else if (action === 'approve')          await teachingApi.approve(id)
      else if (action === 'invoice-sent')     await teachingApi.markInvoiceSent(id)
      else if (action === 'invoice-received') await teachingApi.markInvoiceReceived(id)
      else                                    await teachingApi.markPaid(id)
      toastSuccess(m.done)
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudo completar', err instanceof Error ? err.message : undefined)
    }
  }

  async function handlePdf(id: string) {
    try {
      await teachingApi.downloadPdf(id, selected?.staffName)
    } catch (err) {
      alertError('No se pudo generar el comprobante', err instanceof Error ? err.message : undefined)
    }
  }

  function handleExport() {
    if (!preview?.lines.length || !selected) return
    const slug = selected.staffName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    exportToCsv(`horas-${slug}-${year}-${String(month).padStart(2, '0')}-${dateStamp()}`,
      preview.lines, [
        { label: 'Fecha',    value: l => l.sessionDate },
        { label: 'Comisión', value: l => l.commission ?? '' },
        { label: 'Materia',  value: l => l.subject ?? '' },
        { label: 'Clase',    value: l => l.classLabel ?? '' },
        { label: 'Horas',    value: l => l.hoursPaid },
      ])
  }

  return (
    <div className="comisiones docentes">
      <div className="comisiones__toolbar">
        <div className="period-select">
          <label className="period-select__label">Período</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}>
            {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()]
              .map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {preview && preview.lines.length > 0 && (
          <button className="btn-ghost" type="button" onClick={handleExport}>
            <Download size={16} strokeWidth={2} /> Exportar detalle
          </button>
        )}
      </div>

      {candidates?.length === 0 && (
        <EmptyState
          icon={Calculator}
          message="Sin clases en el período"
          hint={`No hay clases sincrónicas cargadas en ${MONTHS[month - 1]} ${year}. `
              + 'Las clases se cargan desde Académico → Clases.'}
        />
      )}

      {candidates && candidates.length > 0 && (
        <div className="docentes__layout">
          {/* Lista de a quién liquidar. Sale de la grilla, no hay que elegir a mano. */}
          <aside className="docentes__side">
            <h4 className="docentes__side-title">
              Con clases en {MONTHS[month - 1]}
            </h4>
            {candidates.map(c => {
              const done = c.alreadySettled
              const key = `${c.staffId}-${c.role}`
              const isSel = selected?.staffId === c.staffId && selected?.role === c.role
              return (
                <button
                  key={key}
                  type="button"
                  className={`cand ${isSel ? 'cand--active' : ''} ${!c.paidByHours ? 'cand--fixed' : ''}`}
                  onClick={() => c.paidByHours && setSelected(c)}
                  disabled={!c.paidByHours}
                  title={c.paidByHours
                    ? undefined
                    : 'Cobra sueldo fijo: no entra en la liquidación por horas'}
                >
                  <span className="cand__name">{c.staffName}</span>
                  <span className="cand__meta">
                    <span className="badge badge--neutro">{TEACHING_ROLE_LABELS[c.role]}</span>
                    <span className="muted small">{c.classCount} clase{c.classCount === 1 ? '' : 's'}</span>
                  </span>
                  {!c.paidByHours && <span className="cand__flag">sueldo fijo</span>}
                  {done && <span className="cand__flag cand__flag--done">liquidada</span>}
                </button>
              )
            })}
          </aside>

          <section className="docentes__main">
            {!selected && (
              <EmptyState
                icon={Calculator}
                message="Elegí a quién liquidar"
                hint="La lista sale de las clases sincrónicas cargadas en el mes."
              />
            )}

            {selected && loading && <div className="comisiones__loading">Calculando…</div>}

            {selected && !loading && error && (
              <EmptyState icon={Calculator} message="No se pudo calcular" hint={error} />
            )}

            {selected && !loading && !error && preview && (
              <>
                <div className="comisiones__resumen">
                  <table className="buckets-table">
                    <tbody>
                      <tr>
                        <td>Clases del mes</td>
                        <td className="col-precio">{preview.classCount}</td>
                      </tr>
                      <tr>
                        <td>Horas dictadas</td>
                        <td className="col-precio">{formatHours(preview.totalHours)}</td>
                      </tr>
                      {preview.role === 'PRECEPTORA' && (
                        <tr>
                          <td>
                            Anticipación
                            <span className="bucket-hint"
                              title="15 minutos por clase para abrirla. Se suma una vez por clase, no es un % del total.">
                              <Info size={12} />
                            </span>
                          </td>
                          <td className="col-precio">
                            + {formatHours(preview.bonusHours)}
                            <span className="muted small"> (0,25 × {preview.classCount})</span>
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td>Horas a facturar</td>
                        <td className="col-precio"><strong>{formatHours(preview.billableHours)}</strong></td>
                      </tr>
                      <tr>
                        <td>Valor hora</td>
                        <td className="col-precio">{formatPrice(preview.hourlyRate)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="buckets-table__total">
                        <td>Total a pagar</td>
                        <td className="col-precio">{formatPrice(preview.totalAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="comisiones__acciones">
                    {settledFor ? (
                      <div className="comisiones__estado">
                        <span className={`badge ${statusBadgeClass(settledFor.status)}`}>
                          {TEACHING_STATUS_LABELS[settledFor.status]}
                        </span>
                        {canWrite && settledFor.status === 'DRAFT' && (
                          <>
                            <button className="btn-ghost" type="button"
                              onClick={() => handleAction(settledFor.id, 'recompute')}>
                              <RefreshCw size={15} /> Recalcular
                            </button>
                            <button className="btn-primary" type="button"
                              onClick={() => handleAction(settledFor.id, 'approve')}>
                              <BadgeCheck size={15} /> Aprobar
                            </button>
                          </>
                        )}
                        {settledFor.status === 'PAID' && (
                          <button className="btn-ghost" type="button"
                            onClick={() => handlePdf(settledFor.id)}>
                            <Download size={15} /> Comprobante
                          </button>
                        )}
                        {canWrite && settledFor.status === 'APPROVED' && (
                          <>
                            <button className="btn-ghost" type="button"
                              onClick={() => handleAction(settledFor.id, 'invoice-sent')}>
                              <Mail size={15} /> Pedí la factura
                            </button>
                            <button className="btn-ghost" type="button"
                              onClick={() => handleAction(settledFor.id, 'invoice-received')}>
                              <Check size={15} /> Factura recibida
                            </button>
                            <button className="btn-primary" type="button"
                              onClick={() => handleAction(settledFor.id, 'mark-paid')}>
                              <CircleDollarSign size={15} /> Marcar pagada
                            </button>
                          </>
                        )}
                      </div>
                    ) : canWrite && (
                      <button className="btn-primary" type="button"
                        onClick={handleCreate}
                        disabled={saving || preview.totalAmount <= 0}>
                        <Save size={15} /> {saving ? 'Generando…' : 'Generar liquidación'}
                      </button>
                    )}
                  </div>
                </div>

                {preview.lines.length === 0 ? (
                  <EmptyState icon={Clock} message="Sin horas cargadas"
                    hint="Las clases están cargadas pero no tienen horas. Completalas en Académico → Clases." />
                ) : (
                  <div className="comisiones__detalle">
                    <h4 className="comisiones__detalle-title">
                      {preview.lines.length} clase{preview.lines.length === 1 ? '' : 's'} en el período
                    </h4>
                    <table className="detalle-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Comisión</th>
                          <th>Materia</th>
                          <th>Clase</th>
                          <th className="col-precio">Horas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.lines.map((l, i) => (
                          <tr key={l.classSessionId + i}>
                            <td className="td-date">{formatDate(l.sessionDate)}</td>
                            <td>{l.commission ?? <span className="muted">—</span>}</td>
                            <td>{l.subject ?? <span className="muted">—</span>}</td>
                            <td>{l.classLabel ?? <span className="muted">—</span>}</td>
                            <td className="col-precio">{formatHours(l.hoursPaid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="comisiones__nota">
                  <Info size={13} strokeWidth={1.8} />
                  Sólo entran las clases <strong>en vivo</strong>: las asincrónicas no tienen
                  preceptora y quedan fuera. Las horas salen de lo que confirmó Cobranzas en la
                  grilla; si una clase no tiene horas cargadas cuenta igual para la anticipación
                  de la preceptora, pero aporta cero horas.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function statusBadgeClass(s: string): string {
  switch (s) {
    case 'DRAFT':    return 'badge--pendiente'
    case 'APPROVED': return 'badge--suspendida'
    case 'PAID':     return 'badge--activo'
    default:         return ''
  }
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n)
}

function formatDate(iso: string): string {
  // yyyy-MM-dd parseado a mano: `new Date('2026-06-03')` lo toma como UTC y en
  // Argentina muestra el día anterior.
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}
