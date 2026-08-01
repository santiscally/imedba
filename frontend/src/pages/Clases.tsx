import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays, Plus, Download, Pencil, Trash2, Video, VideoOff,
  UserCircle2, Clock, Save, AlertTriangle,
} from 'lucide-react'
import { teachingApi } from '../api/teaching'
import { staffApi } from '../api/staff'
import type { PageResponse } from '../types/common'
import type { ClassSession, HoursToPayRequest } from '../types/teaching'
import { formatHours } from '../types/teaching'
import type { Staff } from '../types/staff'
import EmptyState from '../components/EmptyState'
import ClassSessionForm from '../components/ClassSessionForm'
import { confirmAction, alertError, toastSuccess } from '../lib/confirm'
import { exportToCsv, dateStamp } from '../lib/exportCsv'
import { hasAuthority } from '../lib/auth'
import './Editorial.scss'
import './PersonalAcademico.scss'
import './Clases.scss'

// Grilla de clases dictadas (doc 17 §3.2). Replica la hoja «HS DOCENTE» de la
// planilla de IMEDBA. La carga la secretaría; Cobranzas confirma las horas a
// pagar antes de liquidar.

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export default function Clases() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [onlySync, setOnlySync] = useState(false)

  const [data,    setData]    = useState<PageResponse<ClassSession> | null>(null)
  const [staff,   setStaff]   = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [reload,  setReload]  = useState(0)

  const [editing, setEditing] = useState<ClassSession | 'new' | null>(null)

  /** Ediciones pendientes de `hours_to_pay`, para guardar todas juntas. */
  const [pendingHours, setPendingHours] = useState<Record<string, string>>({})
  const [savingHours, setSavingHours] = useState(false)

  const canWrite = hasAuthority('hour_logs:write')

  useEffect(() => {
    staffApi.list({ active: true, size: 300, sort: 'lastName,asc' })
      .then(r => setStaff(r.content))
      .catch(() => setStaff([]))
  }, [])

  useEffect(() => {
    setLoading(true); setError(null); setPendingHours({})
    teachingApi.listSessions({
      year, month,
      synchronous: onlySync ? true : undefined,
      size: 200, sort: 'sessionDate,asc',
    })
      .then(res => { setData(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [year, month, onlySync, reload])

  // Memoizado: `data?.content ?? []` crea un array nuevo en cada render y haría
  // que el useMemo de abajo recalcule siempre.
  const items = useMemo(() => data?.content ?? [], [data])

  const totals = useMemo(() => {
    const sync = items.filter(s => s.synchronous !== false)
    const hours = sync.reduce((acc, s) => acc + (s.hoursToPay ?? s.actualHours ?? 0), 0)
    // Clases en vivo sin docente cargada: en la planilla de junio hay dos así, y
    // Nico confirmó que es un dato que falta cargar, no que no haya docente. Si
    // no se avisa, esa persona no cobra y nadie se entera.
    const missingTeacher = sync.filter(s => !s.teacherId).length
    return { total: items.length, sync: sync.length, hours, missingTeacher }
  }, [items])

  const dirtyCount = Object.keys(pendingHours).length

  function setHours(id: string, value: string) {
    setPendingHours(prev => ({ ...prev, [id]: value }))
  }

  async function saveHours() {
    const payload: HoursToPayRequest[] = Object.entries(pendingHours)
      .map(([sessionId, raw]) => ({
        sessionId,
        hoursToPay: raw.trim() === '' ? null : Number(raw),
      }))
      .filter(x => x.hoursToPay === null || !Number.isNaN(x.hoursToPay))

    if (payload.length === 0) return
    setSavingHours(true)
    try {
      const res = await teachingApi.setHoursToPay(payload)
      toastSuccess(`${res.updated} ${res.updated === 1 ? 'clase actualizada' : 'clases actualizadas'}`)
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudieron guardar las horas',
        err instanceof Error ? err.message : undefined)
    } finally { setSavingHours(false) }
  }

  async function handleDelete(s: ClassSession) {
    const ok = await confirmAction({
      title: '¿Borrar la clase?',
      text: `${formatDate(s.sessionDate)} — ${s.classLabel ?? s.subject ?? 'sin nombre'}. `
          + 'Si ya entró en una liquidación, esa liquidación no cambia.',
      icon: 'warning', danger: true, confirmText: 'Sí, borrar',
    })
    if (!ok) return
    try {
      await teachingApi.deleteSession(s.id)
      toastSuccess('Clase borrada')
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudo borrar', err instanceof Error ? err.message : undefined)
    }
  }

  function handleExport() {
    if (!items.length) return
    exportToCsv(`clases-${year}-${String(month).padStart(2, '0')}-${dateStamp()}`, items, [
      { label: 'Fecha',       value: s => s.sessionDate },
      { label: 'Comisión',    value: s => s.commission ?? '' },
      { label: 'Materia',     value: s => s.subject ?? '' },
      { label: 'Clase',       value: s => s.classLabel ?? '' },
      { label: 'Modalidad',   value: s => s.synchronous === false ? 'Asincrónica' : 'En vivo' },
      { label: 'Horario',     value: s => s.scheduledTime ?? '' },
      { label: 'Docente',     value: s => s.teacherName ?? '' },
      { label: 'Preceptora',  value: s => s.preceptorName ?? '' },
      { label: 'Horas reales', value: s => s.actualHours ?? '' },
      { label: 'Horas a pagar', value: s => s.hoursToPay ?? '' },
    ])
  }

  return (
    <div className="editorial clases">
      <header className="editorial__header">
        <div>
          <h2 className="editorial__title">
            <span className="editorial__title-icon"><CalendarDays size={22} strokeWidth={2} /></span>
            Clases
          </h2>
          <p className="editorial__subtitle">
            {totals.total > 0
              ? `${totals.total} clase${totals.total === 1 ? '' : 's'} · `
                + `${totals.sync} en vivo · ${formatHours(totals.hours)} a liquidar`
              : 'Grilla de clases dictadas — alimenta la liquidación de horas'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost" type="button" onClick={handleExport} disabled={!items.length}>
            <Download size={16} strokeWidth={2} /> Exportar
          </button>
          {canWrite && (
            <button className="btn-primary" type="button" onClick={() => setEditing('new')}>
              <Plus size={16} strokeWidth={2.2} /> Nueva clase
            </button>
          )}
        </div>
      </header>

      <div className="editorial__toolbar">
        <div className="editorial__filters">
          <select className="filter-select" value={month}
            onChange={e => setMonth(Number(e.target.value))} aria-label="Mes">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="filter-select" value={year}
            onChange={e => setYear(Number(e.target.value))} aria-label="Año">
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
              .map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <label className="filter-check">
            <input type="checkbox" checked={onlySync}
              onChange={e => setOnlySync(e.target.checked)} />
            <span>Sólo en vivo</span>
          </label>
        </div>

        {canWrite && dirtyCount > 0 && (
          <button className="btn-primary" type="button" onClick={saveHours} disabled={savingHours}>
            <Save size={16} strokeWidth={2} />
            {savingHours
              ? 'Guardando…'
              : `Guardar ${dirtyCount} ${dirtyCount === 1 ? 'hora' : 'horas'}`}
          </button>
        )}
      </div>

      {!loading && totals.missingTeacher > 0 && (
        <div className="clases__warn">
          <AlertTriangle size={15} strokeWidth={2} />
          <span>
            <strong>{totals.missingTeacher}</strong>{' '}
            {totals.missingTeacher === 1
              ? 'clase en vivo no tiene docente cargada'
              : 'clases en vivo no tienen docente cargada'}.
            Sin ese dato no entran en ninguna liquidación docente y esa persona no cobra.
          </span>
        </div>
      )}

      <div className="editorial__table-wrap">
        {loading && <div className="editorial__loading">Cargando…</div>}

        {!loading && error && (
          <EmptyState icon={CalendarDays} message="No se pudieron cargar las clases" hint={error} />
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState icon={CalendarDays} message="Sin clases"
            hint={`No hay clases cargadas en ${MONTHS[month - 1]} ${year}.`} />
        )}

        {!loading && !error && items.length > 0 && (
          <table className="editorial-table clases-table">
            <thead>
              <tr>
                <th className="col-fecha">Fecha</th>
                <th>Comisión / Materia</th>
                <th>Clase</th>
                <th className="col-modalidad">Modalidad</th>
                <th>Docente</th>
                <th>Preceptora</th>
                <th className="col-num">Reales</th>
                <th className="col-horas">A pagar</th>
                {canWrite && <th className="col-acciones" />}
              </tr>
            </thead>
            <tbody>
              {items.map(s => {
                const asinc = s.synchronous === false
                return (
                  <tr key={s.id} className={`editorial-table__row ${asinc ? 'is-async' : ''}`}>
                    <td className="col-fecha td-date">{formatDate(s.sessionDate)}</td>
                    <td>
                      <div className="stack">
                        <span>{s.commission ?? <span className="muted">—</span>}</span>
                        {s.subject && <span className="muted small">{s.subject}</span>}
                      </div>
                    </td>
                    <td>{s.classLabel ?? <span className="muted">—</span>}</td>
                    <td className="col-modalidad">
                      {asinc
                        ? <span className="cell-inline muted" title="No entra en la liquidación">
                            <VideoOff size={13} strokeWidth={1.8} /> Asincrónica
                          </span>
                        : <span className="cell-inline"><Video size={13} strokeWidth={1.8} /> En vivo</span>}
                    </td>
                    <td>
                      {s.teacherName
                        ? <span className="cell-inline"><UserCircle2 size={13} strokeWidth={1.6} />{s.teacherName}</span>
                        : <span className={asinc ? 'muted' : 'falta-dato'}>
                            {asinc ? 'sin asignar' : 'falta cargar'}
                          </span>}
                    </td>
                    <td>
                      {s.preceptorName
                        ? <span className="cell-inline"><UserCircle2 size={13} strokeWidth={1.6} />{s.preceptorName}</span>
                        : <span className="muted">—</span>}
                    </td>
                    <td className="col-num">
                      {s.actualHours != null
                        ? formatHours(s.actualHours)
                        : <span className="muted">—</span>}
                    </td>
                    <td className="col-horas">
                      {canWrite ? (
                        <input
                          type="number" min={0} step="0.25"
                          className={`hours-input ${pendingHours[s.id] !== undefined ? 'hours-input--dirty' : ''}`}
                          value={pendingHours[s.id] ?? (s.hoursToPay != null ? String(s.hoursToPay) : '')}
                          onChange={e => setHours(s.id, e.target.value)}
                          placeholder={s.actualHours != null ? String(s.actualHours) : '—'}
                          title="Horas confirmadas por Cobranzas. Vacío = se usan las reales."
                          disabled={asinc}
                        />
                      ) : (
                        s.hoursToPay != null ? formatHours(s.hoursToPay) : <span className="muted">—</span>
                      )}
                    </td>
                    {canWrite && (
                      <td className="col-acciones">
                        <div className="row-actions">
                          <button className="row-actions__btn" type="button" title="Editar"
                            onClick={() => setEditing(s)}>
                            <Pencil size={16} />
                          </button>
                          <button className="row-actions__btn row-actions__btn--danger" type="button"
                            title="Borrar" onClick={() => handleDelete(s)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="clases__nota">
        <Clock size={13} strokeWidth={1.8} />
        La columna <strong>«A pagar»</strong> la completa Cobranzas: es el chequeo final antes de
        pedir la factura. Si queda vacía se usan las horas reales. Las clases asincrónicas no
        entran en la liquidación.
      </p>

      {editing && (
        <ClassSessionForm
          initial={editing === 'new' ? undefined : editing}
          staff={staff}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setReload(r => r + 1) }}
        />
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}
