import { useEffect, useMemo, useState } from 'react'
import {
  GraduationCap, Plus, Download, Search, Pencil, Power,
  Mail, Phone, IdCard, BookOpen, Clock, UserCircle2, Settings2,
} from 'lucide-react'
import { staffApi } from '../api/staff'
import type { PageResponse } from '../types/common'
import type { Staff, StaffSegment, StaffType } from '../types/staff'
import {
  STAFF_SEGMENTS, STAFF_SEGMENT_LABELS, STAFF_TYPES, STAFF_TYPE_LABELS,
} from '../types/staff'
import EmptyState from '../components/EmptyState'
import StaffForm from '../components/StaffForm'
import HourlyRatesModal from '../components/HourlyRatesModal'
import { confirmAction, alertError, toastSuccess } from '../lib/confirm'
import { exportToCsv, dateStamp } from '../lib/exportCsv'
import { hasAuthority } from '../lib/auth'
import './Editorial.scss'
import './PersonalAcademico.scss'

// Personal Académico (doc 17 §4). Docentes, tutoras, preceptoras y directoras.
// NO es un padrón de inscripción: es un listado de contacto que además alimenta
// las liquidaciones (las directoras se referencian desde la diplomatura, y las
// docentes y preceptoras desde la grilla de horas).
//
// Distinto de /personal, que es la gestión de usuarios de Keycloak (solo admin).

const PAGE_SIZE = 20

type TypeFilter    = StaffType | 'TODOS'
type SegmentFilter = StaffSegment | 'TODAS'

export default function PersonalAcademico() {
  const [query,     setQuery]     = useState('')
  const [debounced, setDebounced] = useState('')
  const [type,      setType]      = useState<TypeFilter>('TODOS')
  const [segment,   setSegment]   = useState<SegmentFilter>('TODAS')
  const [onlyActive, setOnlyActive] = useState(true)
  const [page,      setPage]      = useState(0)

  const [data,    setData]    = useState<PageResponse<Staff> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [reload,  setReload]  = useState(0)

  const [editing, setEditing] = useState<Staff | 'new' | null>(null)
  const [exporting, setExporting] = useState(false)
  const [showRates, setShowRates] = useState(false)

  const canWrite = hasAuthority('staff:write')

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setLoading(true); setError(null)
    staffApi.list({
      type:    type === 'TODOS' ? undefined : type,
      segment: segment === 'TODAS' ? undefined : segment,
      active:  onlyActive ? true : undefined,
      q:       debounced || undefined,
      page,
      size:    PAGE_SIZE,
      sort:    'lastName,asc',
    })
      .then(res => { setData(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [type, segment, onlyActive, debounced, page, reload])

  const items = data?.content ?? []
  const total = data?.totalElements ?? 0

  const typeOptions = useMemo<TypeFilter[]>(() => ['TODOS', ...STAFF_TYPES], [])

  async function handleDeactivate(s: Staff) {
    const ok = await confirmAction({
      title: '¿Dar de baja?',
      text:  `${s.lastName}, ${s.firstName} deja de aparecer en los listados y selectores. `
           + 'No se borra el historial de horas ya cargado.',
      icon:  'warning',
      danger: true,
      confirmText: 'Sí, dar de baja',
    })
    if (!ok) return
    try {
      await staffApi.deactivate(s.id)
      toastSuccess('Dado de baja')
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudo dar de baja', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await staffApi.list({
        type:    type === 'TODOS' ? undefined : type,
        segment: segment === 'TODAS' ? undefined : segment,
        active:  onlyActive ? true : undefined,
        size:    2000,
        sort:    'lastName,asc',
      })
      exportToCsv(`personal-academico-${dateStamp()}`, res.content, [
        { label: 'Apellido',  value: s => s.lastName },
        { label: 'Nombre',    value: s => s.firstName },
        { label: 'DNI',       value: s => s.dni ?? '' },
        { label: 'Rol',       value: s => STAFF_TYPE_LABELS[s.staffType] },
        { label: 'Unidad',    value: s => s.segment ? STAFF_SEGMENT_LABELS[s.segment] : '' },
        { label: 'Materia',   value: s => s.subject ?? '' },
        { label: 'Email',     value: s => s.email ?? '' },
        { label: 'Teléfono',  value: s => s.phone ?? '' },
        { label: 'Valor hora', value: s => s.hourlyRate ?? '' },
        { label: 'Tutora',    value: s => s.tutor ? 'Sí' : '' },
        { label: 'Liquida por horas', value: s => s.paidByHours === false ? 'No (sueldo fijo)' : 'Sí' },
        { label: 'Activo',    value: s => s.active === false ? 'No' : 'Sí' },
      ])
    } catch (err) {
      alertError('No se pudo exportar', err instanceof Error ? err.message : undefined)
    } finally { setExporting(false) }
  }

  return (
    <div className="editorial">
      <header className="editorial__header">
        <div>
          <h2 className="editorial__title">
            <span className="editorial__title-icon"><GraduationCap size={22} strokeWidth={2} /></span>
            Personal Académico
          </h2>
          <p className="editorial__subtitle">
            {total > 0
              ? `${total} ${total === 1 ? 'persona' : 'personas'} — docentes, tutoras, preceptoras y directoras`
              : 'Docentes, tutoras, preceptoras y directoras — alimenta las liquidaciones'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost" type="button" onClick={() => setShowRates(true)}
            title="Valor hora de docentes y preceptoras">
            <Settings2 size={16} strokeWidth={2} /> Valores hora
          </button>
          <button className="btn-ghost" type="button" onClick={handleExport} disabled={exporting || !total}>
            <Download size={16} strokeWidth={2} /> {exporting ? 'Exportando…' : 'Exportar'}
          </button>
          {canWrite && (
            <button className="btn-primary" type="button" onClick={() => setEditing('new')}>
              <Plus size={16} strokeWidth={2.2} /> Nueva persona
            </button>
          )}
        </div>
      </header>

      <div className="editorial__toolbar">
        <div className="search">
          <Search size={16} strokeWidth={1.8} className="search__icon" />
          <input
            type="text"
            className="search__input"
            placeholder="Buscar por nombre, DNI, email o materia…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="editorial__filters">
          <div className="chips" role="tablist" aria-label="Rol">
            {typeOptions.map(opt => (
              <button
                key={opt}
                type="button"
                className={`chip ${type === opt ? 'chip--active' : ''}`}
                onClick={() => { setType(opt); setPage(0) }}
                role="tab"
                aria-selected={type === opt}
              >
                {opt === 'TODOS' ? 'Todos' : STAFF_TYPE_LABELS[opt]}
              </button>
            ))}
          </div>

          <select
            className="filter-select"
            value={segment}
            onChange={e => { setSegment(e.target.value as SegmentFilter); setPage(0) }}
            aria-label="Unidad"
            // Filtrar por una unidad concreta incluye a las marcadas "Ambas" —
            // lo resuelve el backend (StaffSpecs.bySegment).
            title="Filtrar por Residencias o Formación Superior también incluye a quienes están en ambas"
          >
            <option value="TODAS">Todas las unidades</option>
            {STAFF_SEGMENTS.map(s => (
              <option key={s} value={s}>{STAFF_SEGMENT_LABELS[s]}</option>
            ))}
          </select>

          <label className="filter-check">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={e => { setOnlyActive(e.target.checked); setPage(0) }}
            />
            <span>Solo activos</span>
          </label>
        </div>
      </div>

      <div className="editorial__table-wrap">
        {loading && <div className="editorial__loading">Cargando…</div>}

        {!loading && error && (
          <EmptyState icon={GraduationCap}
            message="No se pudo cargar el personal académico" hint={error} />
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState icon={GraduationCap} message="Sin resultados"
            hint={debounced
              ? `No hay nadie que coincida con "${debounced}"`
              : 'Cargá la primera persona con el botón de arriba.'} />
        )}

        {!loading && !error && items.length > 0 && (
          <table className="editorial-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Rol / Unidad</th>
                <th>Materia</th>
                <th>Contacto</th>
                <th>Valor hora</th>
                {canWrite && <th className="col-acciones">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(s => (
                <tr key={s.id} className="editorial-table__row">
                  <td>
                    <div className="ed-cell">
                      <div className="ed-cell__icon"><UserCircle2 size={24} strokeWidth={1.4} /></div>
                      <div>
                        <div className="ed-cell__name">{s.lastName}, {s.firstName}</div>
                        {s.dni && (
                          <div className="ed-cell__sub">
                            <IdCard size={11} strokeWidth={1.8} /> {s.dni}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="stack">
                      <span className="badge badge--neutro">{STAFF_TYPE_LABELS[s.staffType]}</span>
                      {s.tutor && <span className="badge badge--tutora">Tutora</span>}
                      {s.segment
                        ? <span className="muted small">{STAFF_SEGMENT_LABELS[s.segment]}</span>
                        : <span className="muted small">sin unidad</span>}
                    </div>
                  </td>
                  <td>
                    {s.subject
                      ? <span className="cell-inline"><BookOpen size={13} strokeWidth={1.8} />{s.subject}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td>
                    <div className="stack">
                      {s.email
                        ? <a className="cell-inline" href={`mailto:${s.email}`}>
                            <Mail size={13} strokeWidth={1.8} />{s.email}
                          </a>
                        : <span className="muted">sin email</span>}
                      {s.phone && (
                        <span className="cell-inline muted small">
                          <Phone size={12} strokeWidth={1.8} />{s.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {s.paidByHours === false
                      ? <span className="muted small">sueldo fijo</span>
                      : s.hourlyRate != null
                        ? <span className="cell-inline"><Clock size={13} strokeWidth={1.8} />{formatPrice(s.hourlyRate)}</span>
                        : <span className="muted small">valor del rol</span>}
                  </td>
                  {canWrite && (
                    <td className="col-acciones">
                      <div className="row-actions">
                        <button className="row-actions__btn" type="button" title="Editar"
                          onClick={() => setEditing(s)}>
                          <Pencil size={16} />
                        </button>
                        {s.active !== false && (
                          <button className="row-actions__btn row-actions__btn--danger" type="button"
                            title="Dar de baja" onClick={() => handleDeactivate(s)}>
                            <Power size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && !error && (data?.totalPages ?? 0) > 1 && (
        <div className="pager">
          <button className="pager__btn" type="button" disabled={data?.first}
            onClick={() => setPage(p => Math.max(0, p - 1))}>Anterior</button>
          <span className="pager__info">Página {page + 1} de {data?.totalPages}</span>
          <button className="pager__btn" type="button" disabled={data?.last}
            onClick={() => setPage(p => p + 1)}>Siguiente</button>
        </div>
      )}

      {showRates && <HourlyRatesModal onClose={() => setShowRates(false)} />}

      {editing && (
        <StaffForm
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setReload(r => r + 1) }}
        />
      )}
    </div>
  )
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)
}
