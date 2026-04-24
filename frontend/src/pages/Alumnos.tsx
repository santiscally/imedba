import { useEffect, useState } from 'react'
import {
  Search, Plus, ChevronLeft, ChevronRight,
  UserCircle2, Users, ArrowUp, ArrowDown, ArrowUpDown,
  Eye, Pencil,
} from 'lucide-react'
import { studentsApi } from '../api/students'
import type { PageResponse } from '../types/common'
import type { Student, StudentCreateRequest } from '../types/student'
import EmptyState from '../components/EmptyState'
import StudentForm from '../components/StudentForm'
import StudentDetail from '../components/StudentDetail'
import './Alumnos.scss'

const PAGE_SIZE = 10

type SortDir   = 'asc' | 'desc'
type SortField = 'lastName' | 'university' | 'active'
type SortState = { field: SortField; dir: SortDir } | null

type PanelState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit';   student: Student }
  | { kind: 'detail'; student: Student }

export default function Alumnos() {
  const [query,     setQuery]     = useState('')
  const [debounced, setDebounced] = useState('')
  const [page,      setPage]      = useState(0)
  const [sort,      setSort]      = useState<SortState>({ field: 'lastName', dir: 'asc' })

  const [data,    setData]    = useState<PageResponse<Student> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [reload,  setReload]  = useState(0)

  const [panel, setPanel] = useState<PanelState>({ kind: 'closed' })

  // Debounce del search — 300ms — resetea a page 0.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setLoading(true); setError(null)
    studentsApi.list({
      q:    debounced || undefined,
      page,
      size: PAGE_SIZE,
      sort: sort ? `${sort.field},${sort.dir}` : undefined,
    })
      .then(res => { setData(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [debounced, page, sort, reload])

  const total      = data?.totalElements ?? 0
  const totalPages = data?.totalPages    ?? 0
  const students   = data?.content       ?? []

  function toggleSort(field: SortField) {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc')             return { field, dir: 'desc' }
      return null  // tercer click → sin orden
    })
    setPage(0)
  }

  function handleSaved() {
    setPanel({ kind: 'closed' })
    setReload(r => r + 1)
  }

  return (
    <div className="alumnos">
      <header className="alumnos__header">
        <div className="alumnos__header-text">
          <h2 className="alumnos__title">
            <span className="alumnos__title-icon"><Users size={22} strokeWidth={2} /></span>
            Alumnos
          </h2>
          <p className="alumnos__subtitle">
            {total > 0
              ? `${total} ${total === 1 ? 'alumno registrado' : 'alumnos registrados'}`
              : 'Gestioná los alumnos del instituto'}
          </p>
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={() => setPanel({ kind: 'create' })}
        >
          <Plus size={16} strokeWidth={2.2} /> Nuevo alumno
        </button>
      </header>

      <div className="alumnos__toolbar">
        <div className="search">
          <Search size={16} strokeWidth={1.8} className="search__icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido, email o DNI…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search__input"
          />
        </div>
      </div>

      <div className="alumnos__table-wrap">
        {loading && <div className="alumnos__loading">Cargando…</div>}

        {!loading && error && (
          <EmptyState
            icon={Users}
            message="No se pudieron cargar los alumnos"
            hint={error}
          />
        )}

        {!loading && !error && students.length === 0 && (
          <EmptyState
            icon={Users}
            message="Sin resultados"
            hint={debounced ? `No hay alumnos para "${debounced}"` : 'No hay alumnos cargados.'}
          />
        )}

        {!loading && !error && students.length > 0 && (
          <table className="alumnos-table">
            <thead>
              <tr>
                <SortableTh
                  label="Alumno"
                  field="lastName"
                  sort={sort}
                  onClick={() => toggleSort('lastName')}
                />
                <th>Email</th>
                <th>DNI</th>
                <SortableTh
                  label="Universidad"
                  field="university"
                  sort={sort}
                  onClick={() => toggleSort('university')}
                />
                <th>Localidad</th>
                <SortableTh
                  label="Estado"
                  field="active"
                  sort={sort}
                  onClick={() => toggleSort('active')}
                  className="col-estado"
                />
                <th className="col-acciones" />
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="alumnos-table__row">
                  <td>
                    <div className="alumno-cell">
                      <div className="alumno-cell__avatar">
                        <UserCircle2 size={28} strokeWidth={1.4} />
                      </div>
                      <div>
                        <div className="alumno-cell__name">
                          {s.firstName} {s.lastName}
                        </div>
                        {s.phone && (
                          <div className="alumno-cell__phone">{s.phone}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="td-email">{s.email}</td>
                  <td>{s.dni ?? '—'}</td>
                  <td>{s.university ?? '—'}</td>
                  <td>{s.locality ?? '—'}</td>
                  <td>
                    <span
                      className={`badge ${s.active ? 'badge--activo' : 'badge--inactivo'}`}
                    >
                      {s.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="col-acciones">
                    <div className="row-actions">
                      <button
                        className="row-actions__btn"
                        type="button"
                        onClick={() => setPanel({ kind: 'detail', student: s })}
                        aria-label="Ver detalle"
                        title="Ver detalle"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="row-actions__btn"
                        type="button"
                        onClick={() => setPanel({ kind: 'edit', student: s })}
                        aria-label="Editar"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && !error && totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          first={data?.first ?? true}
          last={data?.last ?? true}
          onChange={setPage}
        />
      )}

      {panel.kind === 'create' && (
        <StudentForm
          mode="create"
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handleSaved}
          onSubmit={(payload: StudentCreateRequest) => studentsApi.create(payload)}
        />
      )}
      {panel.kind === 'edit' && (
        <StudentForm
          mode="edit"
          initial={panel.student}
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handleSaved}
          onSubmit={(payload) => studentsApi.update(panel.student.id, payload)}
        />
      )}
      {panel.kind === 'detail' && (
        <StudentDetail
          student={panel.student}
          onClose={() => setPanel({ kind: 'closed' })}
          onEdit={() => setPanel({ kind: 'edit', student: panel.student })}
        />
      )}
    </div>
  )
}

// ─── Sortable <th> ───────────────────────────────────────────────────────────
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

// ─── Paginación mejorada ─────────────────────────────────────────────────────
function Pagination(props: {
  page:       number
  totalPages: number
  first:      boolean
  last:       boolean
  onChange:   (page: number) => void
}) {
  const { page, totalPages, first, last, onChange } = props
  const pageNumbers = buildPageNumbers(page, totalPages)

  return (
    <nav className="pager" aria-label="Paginación">
      <button
        className="pager__btn pager__btn--nav"
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={first}
        type="button"
      >
        <ChevronLeft size={18} strokeWidth={2.2} />
        <span>Anterior</span>
      </button>

      <div className="pager__numbers">
        {pageNumbers.map((n, i) =>
          n === '…' ? (
            <span key={`dots-${i}`} className="pager__dots">…</span>
          ) : (
            <button
              key={n}
              type="button"
              className={`pager__num ${n === page ? 'pager__num--active' : ''}`}
              onClick={() => onChange(n)}
              aria-current={n === page ? 'page' : undefined}
            >
              {n + 1}
            </button>
          ),
        )}
      </div>

      <button
        className="pager__btn pager__btn--nav"
        onClick={() => onChange(page + 1)}
        disabled={last}
        type="button"
      >
        <span>Siguiente</span>
        <ChevronRight size={18} strokeWidth={2.2} />
      </button>
    </nav>
  )
}

// Devuelve páginas a mostrar con "…" cuando hay muchas. Ej: [0,1,…,4,5,6,…,11,12].
function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const pages: (number | '…')[] = []
  const push = (v: number | '…') => pages.push(v)

  push(0)
  if (current > 2) push('…')

  const start = Math.max(1, current - 1)
  const end   = Math.min(total - 2, current + 1)
  for (let i = start; i <= end; i++) push(i)

  if (current < total - 3) push('…')
  push(total - 1)

  return pages
}
