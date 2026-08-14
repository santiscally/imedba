import { useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, ChevronLeft, ChevronRight,
  BookOpen, ArrowUp, ArrowDown, ArrowUpDown,
  Tag, GraduationCap, CircleDollarSign,
  Eye, Pencil, Trash2, Users, Download,
} from 'lucide-react'
import { coursesApi } from '../api/courses'
import type { PageResponse } from '../types/common'
import type {
  Course, BusinessUnit, CourseCreateRequest, CourseType, Modality,
} from '../types/course'
import {
  BUSINESS_UNITS, BUSINESS_UNIT_LABELS,
  COURSE_TYPES, COURSE_TYPE_LABELS, MODALITIES, MODALITY_LABELS,
} from '../types/course'
import { useUnidad, unidadBusinessUnit } from '../lib/unidad'
import EmptyState from '../components/EmptyState'
import CourseForm from '../components/CourseForm'
import CourseDetail from '../components/CourseDetail'
import CourseStudents from '../components/CourseStudents'
import { canWrite } from '../lib/access'
import { exportToCsv, dateStamp } from '../lib/exportCsv'
import { confirmAction, alertError, toastSuccess } from '../lib/confirm'
import './Cursos.scss'

const PAGE_SIZE = 10

type SortDir   = 'asc' | 'desc'
type SortField = 'name' | 'modality' | 'coursePrice'
type SortState = { field: SortField; dir: SortDir } | null

type BUFilter = BusinessUnit | 'TODAS'

type PanelState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit';     course: Course }
  | { kind: 'detail';   course: Course }
  | { kind: 'students'; course: Course }

export default function Cursos() {
  const [query,     setQuery]     = useState('')
  const [debounced, setDebounced] = useState('')
  const [bu,        setBu]        = useState<BUFilter>('TODAS')
  const [year,      setYear]      = useState<number | undefined>(undefined)
  const [page,      setPage]      = useState(0)
  const [sort,      setSort]      = useState<SortState>({ field: 'name', dir: 'asc' })

  const [data,    setData]    = useState<PageResponse<Course> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [reload,  setReload]  = useState(0)

  const [panel,     setPanel]     = useState<PanelState>({ kind: 'closed' })
  const [exporting, setExporting] = useState(false)

  const { unidad } = useUnidad()
  const unidadBu = unidadBusinessUnit(unidad)
  // Con una unidad seleccionada, el filtro de chips queda fijado a esa unidad.
  const effectiveBu = unidadBu ?? (bu === 'TODAS' ? undefined : bu)

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Filtros de la taxonomía nueva (V038): son el motivo del pedido —
  // «poder filtrar dependiendo la necesidad y así poder agrupar para análisis».
  const [courseType, setCourseType] = useState<CourseType | ''>('')
  const [modality,   setModality]   = useState<Modality | ''>('')

  // Al cambiar la unidad global, volver a la primera página.
  useEffect(() => { setPage(0) }, [unidad])

  useEffect(() => {
    setLoading(true); setError(null)
    coursesApi.list({
      q:             debounced || undefined,
      businessUnit:  effectiveBu,
      year,
      courseType:    courseType || undefined,
      modality:      modality   || undefined,
      page,
      size:          PAGE_SIZE,
      sort:          sort ? `${sort.field},${sort.dir}` : undefined,
    })
      .then(res => { setData(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [debounced, effectiveBu, year, courseType, modality, page, sort, reload])

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

  function handleSaved() {
    setPanel({ kind: 'closed' })
    setReload(r => r + 1)
  }

  async function handleDelete(c: Course) {
    const ok = await confirmAction({
      title: '¿Eliminar curso?',
      text: `"${c.name}" dejará de aparecer en el listado. Las inscripciones asociadas podrían impedir el borrado.`,
      icon: 'warning', danger: true, confirmText: 'Sí, eliminar',
    })
    if (!ok) return
    try {
      await coursesApi.remove(c.id)
      toastSuccess('Curso eliminado')
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudo eliminar', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await coursesApi.list({
        courseType: courseType || undefined,
        modality:   modality   || undefined,
        q:            debounced || undefined,
        businessUnit: effectiveBu,
        year,
        size:         2000,
        sort:         sort ? `${sort.field},${sort.dir}` : 'name,asc',
      })
      exportToCsv(`cursos-${dateStamp()}`, res.content, [
        { label: 'Nombre',         value: c => c.name },
        { label: 'Código',         value: c => c.code ?? '' },
        { label: 'Unidad',         value: c => c.businessUnit ? BUSINESS_UNIT_LABELS[c.businessUnit] : '' },
        { label: 'Tipo de curso',  value: c => c.courseType ? COURSE_TYPE_LABELS[c.courseType] : '' },
      { label: 'Modalidad',      value: c => c.modality ? MODALITY_LABELS[c.modality] : '' },
        { label: 'Año / Comisión', value: c =>
            c.businessUnit === 'FORMACION_SUPERIOR' && c.commission != null
              ? `Com ${c.commission}${c.academicYear != null ? '/' + c.academicYear : ''}`
              : (c.academicYear ?? 'Libre') },
        { label: 'Precio matrícula', value: c => c.enrollmentPrice ?? '' },
        { label: 'Precio curso',     value: c => c.coursePrice ?? '' },
      ])
    } catch (err) {
      alertError('No se pudo exportar', err instanceof Error ? err.message : undefined)
    } finally { setExporting(false) }
  }

  const buOptions = useMemo<BUFilter[]>(() => ['TODAS', ...BUSINESS_UNITS], [])
  // Ciclos lectivos para el filtro: rango razonable alrededor del año actual.
  const yearOptions = useMemo<number[]>(() => {
    const now = new Date().getFullYear()
    const years: number[] = []
    for (let y = now + 1; y >= now - 3; y--) years.push(y)
    return years
  }, [])

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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost" type="button" onClick={handleExport} disabled={exporting}>
            <Download size={16} strokeWidth={2} /> {exporting ? 'Exportando…' : 'Exportar'}
          </button>
          {canWrite('/cursos') && (
            <button
              className="btn-primary"
              type="button"
              onClick={() => setPanel({ kind: 'create' })}
            >
              <Plus size={16} strokeWidth={2.2} /> Nuevo curso
            </button>
          )}
        </div>
      </header>

      <div className="cursos__toolbar">
        <div className="search">
          <Search size={16} strokeWidth={1.8} className="search__icon" />
          <input
            type="text"
            placeholder="Buscar por nombre o código…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search__input"
          />
        </div>

        {/* Con unidad global seleccionada, el filtro queda fijado a esa unidad. */}
        {!unidadBu && (
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
        )}

        <select
          className="cursos__year-select"
          value={courseType}
          onChange={e => { setCourseType(e.target.value as CourseType | ''); setPage(0) }}
          aria-label="Tipo de curso"
        >
          <option value="">Todos los tipos</option>
          {COURSE_TYPES.map(t => (
            <option key={t} value={t}>{COURSE_TYPE_LABELS[t]}</option>
          ))}
        </select>

        <select
          className="cursos__year-select"
          value={modality}
          onChange={e => { setModality(e.target.value as Modality | ''); setPage(0) }}
          aria-label="Modalidad"
        >
          <option value="">Todas las modalidades</option>
          {MODALITIES.map(m => (
            <option key={m} value={m}>{MODALITY_LABELS[m]}</option>
          ))}
        </select>

        <select
          className="cursos__year-select"
          value={year ?? ''}
          onChange={e => { setYear(e.target.value ? Number(e.target.value) : undefined); setPage(0) }}
          aria-label="Año lectivo"
        >
          <option value="">Todos los años</option>
          {yearOptions.map(y => (
            <option key={y} value={y}>Año {y}</option>
          ))}
        </select>
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
                <th>Año / Comisión</th>
                <SortableTh
                  label="Precio curso"
                  field="coursePrice"
                  sort={sort}
                  onClick={() => toggleSort('coursePrice')}
                  className="col-precio"
                />
                <th className="col-acciones" />
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
                    {c.courseType || c.modality
                      ? <span className="stack">
                          {c.courseType && <span className="pill">{COURSE_TYPE_LABELS[c.courseType]}</span>}
                          {c.modality && <span className="pill pill--modalidad">{MODALITY_LABELS[c.modality]}</span>}
                        </span>
                      : <span className="muted">—</span>}
                  </td>
                  <td>
                    <span className={`bu bu--${c.businessUnit.toLowerCase()}`}>
                      {BUSINESS_UNIT_LABELS[c.businessUnit]}
                    </span>
                  </td>
                  <td>
                    {c.businessUnit === 'FORMACION_SUPERIOR' && c.commission != null
                      ? <span className="pill">Com. {c.commission}{c.academicYear != null ? ` · ${c.academicYear}` : ''}</span>
                      : c.academicYear != null
                        ? <span className="pill">{c.academicYear}</span>
                        : <span className="muted">Libre</span>}
                  </td>
                  <td className="col-precio">
                    {c.coursePrice != null
                      ? <span className="price"><CircleDollarSign size={13} strokeWidth={1.8} />{formatPrice(c.coursePrice)}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="col-acciones">
                    <div className="row-actions">
                      <button
                        className="row-actions__btn"
                        type="button"
                        onClick={() => setPanel({ kind: 'students', course: c })}
                        aria-label="Ver alumnos"
                        title="Ver alumnos inscriptos"
                      >
                        <Users size={16} />
                      </button>
                      <button
                        className="row-actions__btn"
                        type="button"
                        onClick={() => setPanel({ kind: 'detail', course: c })}
                        aria-label="Ver detalle"
                        title="Ver detalle"
                      >
                        <Eye size={16} />
                      </button>
                      {canWrite('/cursos') && (
                        <button
                          className="row-actions__btn"
                          type="button"
                          onClick={() => setPanel({ kind: 'edit', course: c })}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {canWrite('/cursos') && (
                        <button
                          className="row-actions__btn row-actions__btn--danger"
                          type="button"
                          onClick={() => handleDelete(c)}
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
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
        <CourseForm
          mode="create"
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handleSaved}
          onSubmit={(payload: CourseCreateRequest) => coursesApi.create(payload)}
        />
      )}
      {panel.kind === 'edit' && (
        <CourseForm
          mode="edit"
          initial={panel.course}
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handleSaved}
          onSubmit={(payload) => coursesApi.update(panel.course.id, payload)}
        />
      )}
      {panel.kind === 'detail' && (
        <CourseDetail
          course={panel.course}
          onClose={() => setPanel({ kind: 'closed' })}
          onEdit={() => setPanel({ kind: 'edit', course: panel.course })}
        />
      )}
      {panel.kind === 'students' && (
        <CourseStudents
          courseId={panel.course.id}
          courseName={panel.course.name}
          onClose={() => setPanel({ kind: 'closed' })}
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

