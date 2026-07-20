import { useEffect, useState } from 'react'
import {
  Search, Plus, ChevronLeft, ChevronRight,
  UserCircle2, Users, ArrowUp, ArrowDown, ArrowUpDown,
  Eye, Pencil, Trash2, Download,
} from 'lucide-react'
import { studentsApi } from '../api/students'
import { moodleApi } from '../api/moodle'
import { useUnidad, unidadBusinessUnit } from '../lib/unidad'
import type { PageResponse } from '../types/common'
import type { Student, StudentCreateRequest } from '../types/student'
import EmptyState from '../components/EmptyState'
import StudentForm from '../components/StudentForm'
import StudentDetail from '../components/StudentDetail'
import { canWrite } from '../lib/access'
import { hasAuthority } from '../lib/auth'
import { exportToCsv, dateStamp } from '../lib/exportCsv'
import { confirmAction, alertError, toastSuccess } from '../lib/confirm'
import './Alumnos.scss'

const PAGE_SIZE = 10

type SortDir   = 'asc' | 'desc'
type SortField = 'lastName' | 'university'
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

  const [panel,     setPanel]     = useState<PanelState>({ kind: 'closed' })
  const [exporting, setExporting] = useState(false)
  const [exportingUnlinked, setExportingUnlinked] = useState(false)
  const canMoodleRead = hasAuthority('students:read')

  const { unidad } = useUnidad()
  const unidadBu = unidadBusinessUnit(unidad)

  // Debounce del search — 300ms — resetea a page 0.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => { setPage(0) }, [unidad])

  useEffect(() => {
    setLoading(true); setError(null)
    studentsApi.list({
      q:            debounced || undefined,
      businessUnit: unidadBu,
      page,
      size: PAGE_SIZE,
      sort: sort ? `${sort.field},${sort.dir}` : undefined,
    })
      .then(res => { setData(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [debounced, unidadBu, page, sort, reload])

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

  async function handleDelete(s: Student) {
    const ok = await confirmAction({
      title: '¿Eliminar alumno?',
      text: `${s.firstName} ${s.lastName} dejará de aparecer en el listado.`,
      icon: 'warning', danger: true, confirmText: 'Sí, eliminar',
    })
    if (!ok) return
    try {
      await studentsApi.remove(s.id)
      toastSuccess('Alumno eliminado')
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudo eliminar', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await studentsApi.list({
        q:            debounced || undefined,
        businessUnit: unidadBu,
        size:         2000,
        sort:         sort ? `${sort.field},${sort.dir}` : 'lastName,asc',
      })
      exportToCsv(`alumnos-${dateStamp()}`, res.content, [
        { label: 'Apellido',     value: s => s.lastName },
        { label: 'Nombre',       value: s => s.firstName },
        { label: 'DNI',          value: s => s.dni ?? '' },
        { label: 'Email',        value: s => s.email },
        { label: 'Teléfono',     value: s => s.phone ?? '' },
        { label: 'Nacionalidad', value: s => s.nationality ?? '' },
        { label: 'Universidad',  value: s => s.university ?? '' },
        { label: 'Localidad',    value: s => s.locality ?? '' },
      ])
    } catch (err) {
      alertError('No se pudo exportar', err instanceof Error ? err.message : undefined)
    } finally { setExporting(false) }
  }

  // Export de alumnos SIN vincular con Moodle + los cursos a los que están inscriptos.
  // Insumo para que David los cree/alinee en Moodle y luego se corra link-all.
  async function handleExportUnlinked() {
    setExportingUnlinked(true)
    try {
      const rows = await moodleApi.unlinkedStudents()
      exportToCsv(`alumnos-no-vinculados-moodle-${dateStamp()}`, rows, [
        { label: 'Apellido',          value: r => r.lastName },
        { label: 'Nombre',            value: r => r.firstName },
        { label: 'DNI',               value: r => r.dni ?? '' },
        { label: 'Email',             value: r => r.email },
        { label: 'Teléfono',          value: r => r.phone ?? '' },
        { label: 'Cursos inscriptos', value: r => r.courses.length ? r.courses.join(', ') : 'Sin inscripciones' },
      ])
    } catch (err) {
      alertError('No se pudo exportar', err instanceof Error ? err.message : undefined)
    } finally { setExportingUnlinked(false) }
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost" type="button" onClick={handleExport} disabled={exporting}>
            <Download size={16} strokeWidth={2} /> {exporting ? 'Exportando…' : 'Exportar'}
          </button>
          {canMoodleRead && (
            <button
              className="btn-ghost"
              type="button"
              onClick={handleExportUnlinked}
              disabled={exportingUnlinked}
              title="Exportar alumnos sin vincular con Moodle + sus cursos"
            >
              <Download size={16} strokeWidth={2} /> {exportingUnlinked ? 'Exportando…' : 'No vinculados (Moodle)'}
            </button>
          )}
          {canWrite('/alumnos') && (
            <button
              className="btn-primary"
              type="button"
              onClick={() => setPanel({ kind: 'create' })}
            >
              <Plus size={16} strokeWidth={2.2} /> Nuevo alumno
            </button>
          )}
        </div>
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
                <th className="col-estado">Moodle</th>
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
                    {s.moodleUserId != null
                      ? <span className="badge badge--activo">En Moodle</span>
                      : <span className="badge badge--inactivo">Falta dar de alta</span>}
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
                      {canWrite('/alumnos') && (
                        <button
                          className="row-actions__btn"
                          type="button"
                          onClick={() => setPanel({ kind: 'edit', student: s })}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {canWrite('/alumnos') && (
                        <button
                          className="row-actions__btn row-actions__btn--danger"
                          type="button"
                          onClick={() => handleDelete(s)}
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
          onLinked={() => { setPanel({ kind: 'closed' }); setReload(r => r + 1) }}
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
