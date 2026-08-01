import { useEffect, useState } from 'react'
import { X, Clock, Save, Plus, Info } from 'lucide-react'
import { activityTypesApi } from '../api/activity-types'
import type { ActivityType, AppliesTo } from '../types/activity-type'
import {
  APPLIES_TO, APPLIES_TO_LABELS, RATE_DOCENTE, RATE_PRECEPTORA,
} from '../types/activity-type'
import { alertError, toastSuccess } from '../lib/confirm'
import { hasAuthority } from '../lib/auth'
import './StudentForm.scss'
import '../pages/HourlyRates.scss'

interface Props {
  onClose: () => void
}

/**
 * Valores hora. De acá salen los $75.000 de docente y los $6.500 de preceptora
 * que usa la liquidación de horas (doc 17 §3.2).
 *
 * El valor se congela en cada liquidación al emitirla, así que cambiarlo acá
 * afecta a las liquidaciones futuras, nunca a las ya hechas.
 */
export default function HourlyRatesModal({ onClose }: Props) {
  const [items, setItems] = useState<ActivityType[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [reload, setReload] = useState(0)

  /** Ediciones pendientes: id → valor como string. */
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState(false)
  const [newRate, setNewRate] = useState({ name: '', ratePerHour: '', appliesTo: 'ALL' as AppliesTo })

  const canWrite = hasAuthority('staff:write')

  useEffect(() => {
    setEdits({})
    activityTypesApi.list()
      .then(setItems)
      .catch((err: Error) => { setItems([]); setError(err.message) })
  }, [reload])

  const dirty = Object.keys(edits).length

  async function saveAll() {
    setSaving(true)
    try {
      for (const [id, raw] of Object.entries(edits)) {
        const value = Number(raw)
        if (raw.trim() === '' || Number.isNaN(value) || value < 0) continue
        await activityTypesApi.update(id, { ratePerHour: value })
      }
      toastSuccess('Valores actualizados')
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudieron guardar', err instanceof Error ? err.message : undefined)
    } finally { setSaving(false) }
  }

  async function createRate() {
    const value = Number(newRate.ratePerHour)
    if (!newRate.name.trim() || Number.isNaN(value) || value < 0) {
      setError('Poné un nombre y un valor válido')
      return
    }
    setSaving(true); setError(null)
    try {
      await activityTypesApi.create({
        name: newRate.name.trim(),
        ratePerHour: value,
        appliesTo: newRate.appliesTo,
      })
      toastSuccess('Valor hora creado')
      setCreating(false)
      setNewRate({ name: '', ratePerHour: '', appliesTo: 'ALL' })
      setReload(r => r + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear')
    } finally { setSaving(false) }
  }

  /** Los que usa la liquidación por nombre: renombrarlos la rompe. */
  function isUsedBySettlement(name: string): boolean {
    return name === RATE_DOCENTE || name === RATE_PRECEPTORA
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg" onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true">
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><Clock size={18} /></div>
            <h3 className="modal__title">Valores hora</h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="form">
          <p className="rates__nota">
            <Info size={13} strokeWidth={1.8} />
            El valor se <strong>congela al emitir cada liquidación</strong>: cambiarlo acá afecta
            a las próximas, nunca a las ya hechas.
          </p>

          {items === null && <div className="editorial__loading">Cargando…</div>}

          {items && items.length > 0 && (
            <table className="rates-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Aplica a</th>
                  <th className="rates-table__rate">Valor por hora</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id} className={r.active === false ? 'is-inactive' : ''}>
                    <td>
                      <span className="rates-table__name">{r.name}</span>
                      {isUsedBySettlement(r.name) && (
                        <span className="rates-table__tag" title="La liquidación busca este valor por su nombre: si lo renombrás deja de encontrarlo">
                          usado por la liquidación
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="muted small">
                        {r.appliesTo ? APPLIES_TO_LABELS[r.appliesTo] : '—'}
                      </span>
                    </td>
                    <td className="rates-table__rate">
                      {canWrite ? (
                        <input
                          type="number" min={0} step="0.01"
                          className={`rate-input ${edits[r.id] !== undefined ? 'rate-input--dirty' : ''}`}
                          value={edits[r.id] ?? String(r.ratePerHour)}
                          onChange={e => setEdits(prev => ({ ...prev, [r.id]: e.target.value }))}
                        />
                      ) : formatPrice(r.ratePerHour)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {items?.length === 0 && (
            <p className="muted">No hay valores hora cargados.</p>
          )}

          {creating && (
            <div className="rates__new">
              <input type="text" placeholder="Concepto (ej. Hora tutoría)"
                value={newRate.name}
                onChange={e => setNewRate(p => ({ ...p, name: e.target.value }))} />
              <select value={newRate.appliesTo}
                onChange={e => setNewRate(p => ({ ...p, appliesTo: e.target.value as AppliesTo }))}>
                {APPLIES_TO.map(a => (
                  <option key={a} value={a}>{APPLIES_TO_LABELS[a]}</option>
                ))}
              </select>
              <input type="number" min={0} step="0.01" placeholder="Valor"
                value={newRate.ratePerHour}
                onChange={e => setNewRate(p => ({ ...p, ratePerHour: e.target.value }))} />
              <button type="button" className="btn-primary" onClick={createRate} disabled={saving}>
                Agregar
              </button>
            </div>
          )}

          {error && <div className="form__error">{error}</div>}

          <footer className="form__footer">
            {canWrite && !creating && (
              <button type="button" className="btn-ghost" onClick={() => setCreating(true)}>
                <Plus size={15} /> Nuevo valor
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cerrar
            </button>
            {canWrite && dirty > 0 && (
              <button type="button" className="btn-primary" onClick={saveAll} disabled={saving}>
                <Save size={15} />
                {saving ? 'Guardando…' : `Guardar ${dirty} cambio${dirty === 1 ? '' : 's'}`}
              </button>
            )}
          </footer>
        </div>
      </div>
    </div>
  )
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
  }).format(n)
}
