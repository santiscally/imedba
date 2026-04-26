import { useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, ChevronLeft, ChevronRight,
  FileText, ArrowUp, ArrowDown, ArrowUpDown,
  UserCircle2, GraduationCap, Eye, Pencil, Tag,
} from 'lucide-react'
import { enrollmentsApi } from '../api/enrollments'
import type { PageResponse } from '../types/common'
import type {
  Enrollment,
  EnrollmentStatus,
  EnrollmentCreateRequest,
} from '../types/enrollment'
import { ENROLLMENT_STATUSES, ENROLLMENT_STATUS_LABELS } from '../types/enrollment'
import EmptyState from '../components/EmptyState'
import EnrollmentForm from '../components/EnrollmentForm'
import EnrollmentDetail from '../components/EnrollmentDetail'
import './Inscripciones.scss'

const PAGE_SIZE = 10

type SortDir   = 'asc' | 'desc'
type SortField =
  | 'enrollmentDate'
  | 'studentLastName'
  | 'courseName'
  | 'totalPrice'
  | 'status'
type SortState = { field: SortField; dir: SortDir } | null

type StatusFilter = EnrollmentStatus | 'TODAS'

type PanelState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit';   en: Enrollment }
  | { kind: 'detail'; en: Enrollment }

export default function Inscripciones() {
  const [query,     setQuery]     = useState('')
  const [debounced, setDebounced] = useState('')
  const [status,    setStatus]    = useState<StatusFilter>('TODAS')
  const [page,      setPage]      = useState(0)
  const [sort,      setSort]      = useState<SortState>({ field: 'enrollmentDate', dir: 'desc' })

  const [data,    setData]    = useState<PageResponse<Enrollment> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [reload,  setReload]  = useState(0)

  const [panel, setPanel] = useState<PanelState>({ kind: 'closed' })

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setLoading(true); setError(null)
    // `q` se manda al mock (lo filtra server-side) y al backend real (lo ignora).
    // Para cuando conecte al backend, agregar filtro client-side ver `filtered`.
    enrollmentsApi.list({
      q:      debounced || undefined,
      status: status === 'TODAS' ? undefined : status,
      page,
      size:   PAGE_SIZE,
      sort:   sort ? `${sort.field},${sort.dir}` : undefined,
    })
      .then(res => { setData(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [debounced, status, page, sort, reload])

  const total      = data?.totalElements ?? 0
  const totalPages = data?.totalPages    ?? 0

  // Filtro client-side por `q` (apellido alumno / email / curso / código) — el
  // backend real no tiene full-text search sobre enrollments. Los mocks lo
  // soportan server-side, así que esto es redundante con el mock pero correcto.
  const filtered = useMemo(() => {
    const items = data?.content ?? []
    if (!debounced) return items
    const needle = debounced.toLowerCase()
    return items.filter(en =>
      en.student.lastName.toLowerCase().includes(needle) ||
      en.student.firstName.toLowerCase().includes(needle) ||
      en.student.email.toLowerCase().includes(needle) ||
      en.course.name.toLowerCase().includes(needle) ||
      (en.course.code?.toLowerCase().includes(needle) ?? false)
    )
  }, [data, debounced])

  function toggleSort(field: SortField) {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc')             return { field, dir: 'desc' }
      return null
    })
    setPage(0)
  }

  function handleSaved() {
    setPanel({ kind: 'closed' })
    setReload(r => r + 1)
  }

  async function handleStatusAction(
    en: Enrollment,
    action: 'suspend' | 'reactivate' | 'cancel',
  ) {
    try {
      const fn = action === 'suspend'    ? enrollmentsApi.suspend
              : action === 'reactivate' ? enrollmentsApi.reactivate
              :                            enrollmentsApi.cancel
      await fn(en.id)
      handleSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  const statusOptions = useMemo<StatusFilter[]>(
    () => ['TODAS', ...ENROLLMENT_STATUSES],
    [],
  )

  return (
    <div className="inscripciones">
      <header className="inscripciones__header">
        <div className="inscripciones__header-text">
          <h2 className="inscripciones__title">
            <span className="inscripciones__title-icon"><FileText size={22} strokeWidth={2} /></span>
            Inscripciones
          </h2>
          <p className="inscripciones__subtitle">
            {total > 0
              ? `${total} ${total === 1 ? 'inscripción registrada' : 'inscripciones registradas'}`
              : 'Gestioná las inscripciones a los cursos'}
          </p>
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={() => setPanel({ kind: 'create' })}
        >
          <Plus size={16} strokeWidth={2.2} /> Nueva inscripción
        </button>
      </header>

      <div className="inscripciones__toolbar">
        <div className="search">
          <Search size={16} strokeWidth={1.8} className="search__icon" />
          <input
            type="text"
            placeholder="Buscar por alumno, email o curso…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search__input"
          />
        </div>

        <div className="inscripciones__chips" role="tablist" aria-label="Estado">
          {statusOptions.map(opt => (
            <button
              key={opt}
              type="button"
              className={`chip ${status === opt ? 'chip--active' : ''}`}
              onClick={() => { setStatus(opt); setPage(0) }}
              role="tab"
              aria-selected={status === opt}
            >
              {opt === 'TODAS' ? 'Todas' : ENROLLMENT_STATUS_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      <div className="inscripciones__table-wrap">
        {loading && <div className="inscripciones__loading">Cargando…</div>}

        {!loading && error && (
          <EmptyState
            icon={FileText}
            message="No se pudieron cargar las inscripciones"
            hint={error}
          />
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            icon={FileText}
            message="Sin resultados"
            hint={debounced
              ? `No hay inscripciones para "${debounced}"`
              : 'No hay inscripciones cargadas.'}
          />
        )}

        {!loading && !error && filtered.length > 0 && (
          <table className="inscripciones-table">
            <thead>
              <tr>
                <SortableTh
                  label="Alumno"
                  field="studentLastName"
                  sort={sort}
                  onClick={() => toggleSort('studentLastName')}
                />
                <SortableTh
                  label="Curso"
                  field="courseName"
                  sort={sort}
                  onClick={() => toggleSort('courseName')}
                />
                <SortableTh
                  label="Fecha"
                  field="enrollmentDate"
                  sort={sort}
                  onClick={() => toggleSort('enrollmentDate')}
                />
                <SortableTh
                  label="Total"
                  field="totalPrice"
                  sort={sort}
                  onClick={() => toggleSort('totalPrice')}
                  className="col-precio"
                />
                <SortableTh
                  label="Estado"
                  field="status"
                  sort={sort}
                  onClick={() => toggleSort('status')}
                  className="col-estado"
                />
                <th className="col-acciones" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(en => (
                <tr key={en.id} className="inscripciones-table__row">
                  <td>
                    <div className="insc-cell">
                      <div className="insc-cell__avatar">
                        <UserCircle2 size={26} strokeWidth={1.4} />
                      </div>
                      <div>
                        <div className="insc-cell__name">
                          {en.student.lastName}, {en.student.firstName}
                        </div>
                        <div className="insc-cell__email">{en.student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="insc-course">
                      <GraduationCap size={16} strokeWidth={1.6} />
                      <div>
                        <div className="insc-course__name">{en.course.name}</div>
                        {en.course.code && (
                          <div className="insc-course__code">
                            <Tag size={11} strokeWidth={1.8} /> {en.course.code}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="td-date">{formatDate(en.enrollmentDate)}</td>
                  <td className="col-precio">
                    {en.totalPrice != null
                      ? <span className="price">{formatPrice(en.totalPrice)}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td>
                    <span className={`badge ${statusBadgeClass(en.status)}`}>
                      {ENROLLMENT_STATUS_LABELS[en.status]}
                    </span>
                  </td>
                  <td className="col-acciones">
                    <div className="row-actions">
                      <button
                        className="row-actions__btn"
                        type="button"
                        onClick={() => setPanel({ kind: 'detail', en })}
                        aria-label="Ver detalle"
                        title="Ver detalle"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="row-actions__btn"
                        type="button"
                        onClick={() => setPanel({ kind: 'edit', en })}
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
        <EnrollmentForm
          mode="create"
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handleSaved}
          onSubmit={(payload) => enrollmentsApi.create(payload as EnrollmentCreateRequest)}
        />
      )}
      {panel.kind === 'edit' && (
        <EnrollmentForm
          mode="edit"
          initial={panel.en}
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handleSaved}
          onSubmit={(payload) => enrollmentsApi.update(panel.en.id, payload)}
        />
      )}
      {panel.kind === 'detail' && (
        <EnrollmentDetail
          en={panel.en}
          onClose={() => setPanel({ kind: 'closed' })}
          onEdit={() => setPanel({ kind: 'edit', en: panel.en })}
          onSuspend={() => handleStatusAction(panel.en, 'suspend')}
          onReactivate={() => handleStatusAction(panel.en, 'reactivate')}
          onCancel={() => handleStatusAction(panel.en, 'cancel')}
        />
      )}
    </div>
  )
}

function statusBadgeClass(s: EnrollmentStatus): string {
  switch (s) {
    case 'ACTIVE':    return 'badge--activo'
    case 'COMPLETED': return 'badge--completada'
    case 'SUSPENDED': return 'badge--suspendida'
    case 'CANCELLED': return 'badge--inactivo'
  }
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
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
