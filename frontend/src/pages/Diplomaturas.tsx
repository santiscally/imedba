import { useEffect, useMemo, useState } from 'react'
import {
  Search, Plus,
  GraduationCap, ArrowUp, ArrowDown, ArrowUpDown,
  University, CircleDollarSign, Percent, Users,
  Eye, Pencil, Trash2,
} from 'lucide-react'
import { diplomasApi } from '../api/diplomas'
import type { Diploma, DiplomaCreateRequest } from '../types/diploma'
import EmptyState from '../components/EmptyState'
import DiplomaForm from '../components/DiplomaForm'
import DiplomaDetail from '../components/DiplomaDetail'
import { canWrite } from '../lib/access'
import './Diplomaturas.scss'

type SortDir   = 'asc' | 'desc'
type SortField = 'name' | 'universityName' | 'coursePrice' | 'partnersCount'
type SortState = { field: SortField; dir: SortDir } | null

type PanelState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit';   diploma: Diploma }
  | { kind: 'detail'; diploma: Diploma }

export default function Diplomaturas() {
  const [query,        setQuery]        = useState('')
  const [debounced,    setDebounced]    = useState('')
  const [sort,         setSort]         = useState<SortState>({ field: 'name', dir: 'asc' })

  const [items,   setItems]   = useState<Diploma[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [reload,  setReload]  = useState(0)

  const [panel, setPanel] = useState<PanelState>({ kind: 'closed' })

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()) }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setLoading(true); setError(null)
    diplomasApi.list({})
      .then(res => { setItems(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [reload])

  const visible = useMemo(() => {
    if (!items) return []
    let list = items.filter(d => d.active !== false)
    if (debounced) {
      const needle = debounced.toLowerCase()
      list = list.filter(d =>
        d.name.toLowerCase().includes(needle) ||
        (d.universityName?.toLowerCase().includes(needle) ?? false) ||
        (d.description?.toLowerCase().includes(needle) ?? false)
      )
    }
    if (sort) {
      const { field, dir } = sort
      const mult = dir === 'desc' ? -1 : 1
      list = [...list].sort((a, b) => compare(a, b, field) * mult)
    }
    return list
  }, [items, debounced, sort])

  function toggleSort(field: SortField) {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc')             return { field, dir: 'desc' }
      return null
    })
  }

  function handleSaved() {
    setPanel({ kind: 'closed' })
    setReload(r => r + 1)
  }

  async function handleDelete(d: Diploma) {
    if (!window.confirm(`¿Eliminar la diplomatura "${d.name}"?`)) return
    try {
      await diplomasApi.deactivate(d.id)
      setReload(r => r + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const total = items?.length ?? 0

  return (
    <div className="diplomaturas">
      <header className="diplomaturas__header">
        <div className="diplomaturas__header-text">
          <h2 className="diplomaturas__title">
            <span className="diplomaturas__title-icon"><GraduationCap size={22} strokeWidth={2} /></span>
            Diplomaturas
          </h2>
          <p className="diplomaturas__subtitle">
            {total > 0
              ? `${total} ${total === 1 ? 'diplomatura registrada' : 'diplomaturas registradas'}`
              : 'Programas de formación superior con reparto de directoras'}
          </p>
        </div>
        {canWrite('/diplomaturas') && (
          <button
            className="btn-primary"
            type="button"
            onClick={() => setPanel({ kind: 'create' })}
          >
            <Plus size={16} strokeWidth={2.2} /> Nueva diplomatura
          </button>
        )}
      </header>

      <div className="diplomaturas__toolbar">
        <div className="search">
          <Search size={16} strokeWidth={1.8} className="search__icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, universidad o descripción…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search__input"
          />
        </div>
      </div>

      <div className="diplomaturas__table-wrap">
        {loading && <div className="diplomaturas__loading">Cargando…</div>}

        {!loading && error && (
          <EmptyState
            icon={GraduationCap}
            message="No se pudieron cargar las diplomaturas"
            hint={error}
          />
        )}

        {!loading && !error && visible.length === 0 && (
          <EmptyState
            icon={GraduationCap}
            message="Sin resultados"
            hint={debounced ? `No hay diplomaturas para "${debounced}"` : 'No hay diplomaturas cargadas.'}
          />
        )}

        {!loading && !error && visible.length > 0 && (
          <table className="diplomaturas-table">
            <thead>
              <tr>
                <SortableTh
                  label="Nombre"
                  field="name"
                  sort={sort}
                  onClick={() => toggleSort('name')}
                />
                <SortableTh
                  label="Universidad"
                  field="universityName"
                  sort={sort}
                  onClick={() => toggleSort('universityName')}
                  className="col-uni"
                />
                <SortableTh
                  label="Precio curso"
                  field="coursePrice"
                  sort={sort}
                  onClick={() => toggleSort('coursePrice')}
                  className="col-precio"
                />
                <th className="col-reparto">Reparto</th>
                <SortableTh
                  label="Directoras"
                  field="partnersCount"
                  sort={sort}
                  onClick={() => toggleSort('partnersCount')}
                  className="col-socias"
                />
                <th className="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(d => {
                const totalAssigned = Math.round(
                  ((d.adminPct ?? 0) + (d.universityPct ?? 0) + (d.imedbaPct ?? 0)
                    + (d.partnersConfig?.reduce((a, p) => a + p.pct, 0) ?? 0)) * 100,
                ) / 100
                return (
                  <tr key={d.id} className="diplomaturas-table__row">
                    <td>
                      <div className="diploma-cell">
                        <div className="diploma-cell__icon">
                          <GraduationCap size={20} strokeWidth={1.5} />
                        </div>
                        <div className="diploma-cell__text">
                          <div className="diploma-cell__name">{d.name}</div>
                          {d.description && (
                            <div className="diploma-cell__desc">{d.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="col-uni">
                      {d.universityName
                        ? (
                          <span className="cell-inline">
                            <University size={13} strokeWidth={1.8} />
                            {d.universityName}
                          </span>
                        )
                        : <span className="muted">—</span>}
                    </td>
                    <td className="col-precio">
                      {d.coursePrice != null
                        ? <span className="price"><CircleDollarSign size={13} strokeWidth={1.8} />{formatPrice(d.coursePrice)}</span>
                        : <span className="muted">—</span>}
                    </td>
                    <td className="col-reparto">
                      <span className={`reparto ${totalAssigned > 100 ? 'reparto--err' : ''}`}>
                        <Percent size={12} strokeWidth={1.8} />
                        {totalAssigned}% asignado
                      </span>
                    </td>
                    <td className="col-socias">
                      <span className="cell-inline">
                        <Users size={13} strokeWidth={1.8} />
                        {d.partnersConfig?.length ?? 0}
                      </span>
                    </td>
                    <td className="col-acciones">
                      <div className="row-actions">
                        <button
                          className="row-actions__btn"
                          type="button"
                          onClick={() => setPanel({ kind: 'detail', diploma: d })}
                          aria-label="Ver detalle"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        {canWrite('/diplomaturas') && (
                          <>
                            <button
                              className="row-actions__btn"
                              type="button"
                              onClick={() => setPanel({ kind: 'edit', diploma: d })}
                              aria-label="Editar"
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="row-actions__btn"
                              type="button"
                              onClick={() => handleDelete(d)}
                              aria-label="Eliminar"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {panel.kind === 'create' && (
        <DiplomaForm
          mode="create"
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handleSaved}
          onSubmit={(payload: DiplomaCreateRequest) => diplomasApi.create(payload)}
        />
      )}
      {panel.kind === 'edit' && (
        <DiplomaForm
          mode="edit"
          initial={panel.diploma}
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handleSaved}
          onSubmit={(payload) => diplomasApi.update(panel.diploma.id, payload)}
        />
      )}
      {panel.kind === 'detail' && (
        <DiplomaDetail
          diploma={panel.diploma}
          onClose={() => setPanel({ kind: 'closed' })}
          onEdit={() => setPanel({ kind: 'edit', diploma: panel.diploma })}
        />
      )}
    </div>
  )
}

function SortableTh(props: {
  label:     string
  field:     SortField
  sort:      SortState
  onClick:   () => void
  className?: string
}) {
  const { label, field, sort, onClick, className } = props
  const isActive = sort?.field === field
  const dir      = isActive ? sort.dir : null

  return (
    <th
      onClick={onClick}
      className={`th-sortable ${isActive ? 'th-sortable--active' : ''} ${className ?? ''}`}
    >
      <span className="th-sortable__label">
        {label}
        <span className="th-sortable__icon">
          {dir === 'asc'  && <ArrowUp size={13} strokeWidth={2.2} />}
          {dir === 'desc' && <ArrowDown size={13} strokeWidth={2.2} />}
          {dir === null   && <ArrowUpDown size={13} strokeWidth={1.8} />}
        </span>
      </span>
    </th>
  )
}

function compare(a: Diploma, b: Diploma, field: SortField): number {
  switch (field) {
    case 'name':           return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    case 'universityName': return strCompare(a.universityName, b.universityName)
    case 'coursePrice':    return numCompare(a.coursePrice,    b.coursePrice)
    case 'partnersCount':  return (a.partnersConfig?.length ?? 0) - (b.partnersConfig?.length ?? 0)
  }
}

function strCompare(a: string | null, b: string | null): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a.localeCompare(b, 'es', { sensitivity: 'base' })
}

function numCompare(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a - b
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)
}
