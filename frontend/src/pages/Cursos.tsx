import { useEffect, useMemo, useState } from 'react'
import {
  Search, ChevronLeft, ChevronRight,
  BookOpen, ArrowUp, ArrowDown, ArrowUpDown,
  CalendarDays, Tag, GraduationCap, CircleDollarSign,
} from 'lucide-react'
import { coursesApi } from '../api/courses'
import type { PageResponse } from '../types/common'
import type { Course, BusinessUnit } from '../types/course'
import { BUSINESS_UNITS, BUSINESS_UNIT_LABELS } from '../types/course'
import EmptyState from '../components/EmptyState'
import './Cursos.scss'

const PAGE_SIZE = 10

type SortDir   = 'asc' | 'desc'
type SortField = 'name' | 'modality' | 'coursePrice' | 'active'
type SortState = { field: SortField; dir: SortDir } | null

type BUFilter = BusinessUnit | 'TODAS'

export default function Cursos() {
  const [query,     setQuery]     = useState('')
  const [debounced, setDebounced] = useState('')
  const [bu,        setBu]        = useState<BUFilter>('TODAS')
  const [page,      setPage]      = useState(0)
  const [sort,      setSort]      = useState<SortState>({ field: 'name', dir: 'asc' })

  const [data,    setData]    = useState<PageResponse<Course> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setLoading(true); setError(null)
    coursesApi.list({
      q:             debounced || undefined,
      businessUnit:  bu === 'TODAS' ? undefined : bu,
      page,
      size:          PAGE_SIZE,
      sort:          sort ? `${sort.field},${sort.dir}` : undefined,
    })
      .then(res => { setData(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [debounced, bu, page, sort])

  const total      = data?.totalElements ?? 0
  const totalPages = data?.totalPages    ?? 0
  const courses    = data?.content       ?? []

  function toggleSort(field: SortField) {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc')             return { field, dir: 'desc' }
      return null
    })
    setPage(0)
  }

  const buOptions = useMemo<BUFilter[]>(() => ['TODAS', ...BUSINESS_UNITS], [])

  return (
    <div className="cursos">
      <header className="cursos__header">
        <div className="cursos__header-text">
          <h2 className="cursos__title">
            <span className="cursos__title-icon"><BookOpen size={22} strokeWidth={2} /></span>
            Cursos
          </h2>
          <p className="cursos__subtitle">
            {total > 0
              ? `${total} ${total === 1 ? 'curso en catálogo' : 'cursos en catálogo'}`
              : 'Catálogo de cursos del instituto'}
          </p>
        </div>
      </header>

      <div className="cursos__toolbar">
        <div className="search">
          <Search size={16} strokeWidth={1.8} className="search__icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o modalidad…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search__input"
          />
        </div>

        <div className="cursos__chips" role="tablist" aria-label="Unidad de negocio">
          {buOptions.map(opt => (
            <button
              key={opt}
              type="button"
              className={`chip ${bu === opt ? 'chip--active' : ''}`}
              onClick={() => { setBu(opt); setPage(0) }}
              role="tab"
              aria-selected={bu === opt}
            >
              {opt === 'TODAS' ? 'Todas' : BUSINESS_UNIT_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      <div className="cursos__table-wrap">
        {loading && <div className="cursos__loading">Cargando…</div>}

        {!loading && error && (
          <EmptyState
            icon={BookOpen}
            message="No se pudieron cargar los cursos"
            hint={error}
          />
        )}

        {!loading && !error && courses.length === 0 && (
          <EmptyState
            icon={BookOpen}
            message="Sin resultados"
            hint={debounced ? `No hay cursos para "${debounced}"` : 'No hay cursos cargados.'}
          />
        )}

        {!loading && !error && courses.length > 0 && (
          <table className="cursos-table">
            <thead>
              <tr>
                <SortableTh
                  label="Curso"
                  field="name"
                  sort={sort}
                  onClick={() => toggleSort('name')}
                />
                <SortableTh
                  label="Modalidad"
                  field="modality"
                  sort={sort}
                  onClick={() => toggleSort('modality')}
                />
                <th>Unidad</th>
                <th>Examen</th>
                <SortableTh
                  label="Precio curso"
                  field="coursePrice"
                  sort={sort}
                  onClick={() => toggleSort('coursePrice')}
                  className="col-precio"
                />
                <SortableTh
                  label="Estado"
                  field="active"
                  sort={sort}
                  onClick={() => toggleSort('active')}
                  className="col-estado"
                />
              </tr>
            </thead>
            <tbody>
              {courses.map(c => (
                <tr key={c.id} className="cursos-table__row">
                  <td>
                    <div className="curso-cell">
                      <div className="curso-cell__icon">
                        <GraduationCap size={22} strokeWidth={1.5} />
                      </div>
                      <div className="curso-cell__text">
                        <div className="curso-cell__name">{c.name}</div>
                        {c.code && (
                          <div className="curso-cell__code">
                            <Tag size={12} strokeWidth={1.8} /> {c.code}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    {c.modality
                      ? <span className="pill">{c.modality}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td>
                    <span className={`bu bu--${c.businessUnit.toLowerCase()}`}>
                      {BUSINESS_UNIT_LABELS[c.businessUnit]}
                    </span>
                  </td>
                  <td className="td-date">
                    {c.examDate
                      ? <><CalendarDays size={13} strokeWidth={1.8} /> {formatDate(c.examDate)}</>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="col-precio">
                    {c.coursePrice != null
                      ? <span className="price"><CircleDollarSign size={13} strokeWidth={1.8} />{formatPrice(c.coursePrice)}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td>
                    <span className={`badge ${c.active ? 'badge--activo' : 'badge--inactivo'}`}>
                      {c.active ? 'Activo' : 'Inactivo'}
                    </span>
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

// ─── Pagination ──────────────────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(iso: string): string {
  // iso viene como YYYY-MM-DD (LocalDate). Se parsea a mano para que no corra TZ.
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1)
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
