import { useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, ChevronLeft, ChevronRight,
  PenTool, ArrowUp, ArrowDown, ArrowUpDown,
  UserCircle2, Mail, Eye, Pencil, Trash2,
} from 'lucide-react'
import { authorsApi } from '../api/authors'
import type { PageResponse } from '../types/common'
import type { Author, AuthorCreateRequest, AuthorUpdateRequest } from '../types/author'
import EmptyState from '../components/EmptyState'
import AuthorForm from '../components/AuthorForm'
import AuthorDetail from '../components/AuthorDetail'
import { confirmAction, alertError, toastSuccess } from '../lib/confirm'
import './Editorial.scss'

const PAGE_SIZE = 10
type SortDir   = 'asc' | 'desc'
type SortField = 'lastName' | 'email' | 'active'
type SortState = { field: SortField; dir: SortDir } | null
type ActiveFilter = 'TODOS' | 'ACTIVOS' | 'INACTIVOS'

type PanelState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit';   author: Author }
  | { kind: 'detail'; author: Author }

export default function Autores() {
  const [query,     setQuery]     = useState('')
  const [debounced, setDebounced] = useState('')
  const [activeF,   setActiveF]   = useState<ActiveFilter>('TODOS')
  const [page,      setPage]      = useState(0)
  const [sort,      setSort]      = useState<SortState>({ field: 'lastName', dir: 'asc' })

  const [data,    setData]    = useState<PageResponse<Author> | null>(null)
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
    authorsApi.list({
      q:      debounced || undefined,
      active: activeF === 'TODOS' ? undefined : activeF === 'ACTIVOS',
      page,
      size:   PAGE_SIZE,
      sort:   sort ? `${sort.field},${sort.dir}` : undefined,
    })
      .then(res => { setData(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [debounced, activeF, page, sort, reload])

  const total      = data?.totalElements ?? 0
  const totalPages = data?.totalPages    ?? 0
  const authors    = data?.content       ?? []

  function toggleSort(field: SortField) {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc')             return { field, dir: 'desc' }
      return null
    })
    setPage(0)
  }

  function handleSaved() { setPanel({ kind: 'closed' }); setReload(r => r + 1) }

  async function handleDeactivate(a: Author) {
    const ok = await confirmAction({
      title: '¿Desactivar autor?',
      text:  `${a.firstName} ${a.lastName} dejará de figurar como activo.`,
      icon:  'warning', danger: true, confirmText: 'Sí, desactivar',
    })
    if (!ok) return
    try {
      await authorsApi.deactivate(a.id)
      toastSuccess('Autor desactivado')
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudo desactivar', err instanceof Error ? err.message : undefined)
    }
  }

  const filters = useMemo<ActiveFilter[]>(() => ['TODOS', 'ACTIVOS', 'INACTIVOS'], [])

  return (
    <div className="editorial">
      <header className="editorial__header">
        <div>
          <h2 className="editorial__title">
            <span className="editorial__title-icon"><PenTool size={22} strokeWidth={2} /></span>
            Autores
          </h2>
          <p className="editorial__subtitle">
            {total > 0 ? `${total} ${total === 1 ? 'autor' : 'autores'}` : 'Autores de los libros del catálogo'}
          </p>
        </div>
        <button className="btn-primary" type="button" onClick={() => setPanel({ kind: 'create' })}>
          <Plus size={16} strokeWidth={2.2} /> Nuevo autor
        </button>
      </header>

      <div className="editorial__toolbar">
        <div className="search">
          <Search size={16} strokeWidth={1.8} className="search__icon" />
          <input type="text" className="search__input" placeholder="Buscar por nombre o email…"
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="editorial__chips" role="tablist" aria-label="Estado">
          {filters.map(opt => (
            <button key={opt} type="button"
              className={`chip ${activeF === opt ? 'chip--active' : ''}`}
              onClick={() => { setActiveF(opt); setPage(0) }}
              role="tab" aria-selected={activeF === opt}>
              {opt === 'TODOS' ? 'Todos' : opt === 'ACTIVOS' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>
      </div>

      <div className="editorial__table-wrap">
        {loading && <div className="editorial__loading">Cargando…</div>}
        {!loading && error && <EmptyState icon={PenTool} message="No se pudieron cargar los autores" hint={error} />}
        {!loading && !error && authors.length === 0 && (
          <EmptyState icon={PenTool} message="Sin resultados"
            hint={debounced ? `No hay autores para "${debounced}"` : 'No hay autores cargados.'} />
        )}
        {!loading && !error && authors.length > 0 && (
          <table className="editorial-table">
            <thead>
              <tr>
                <SortTh label="Autor" active={sort?.field === 'lastName'} dir={sort?.field === 'lastName' ? sort.dir : null} onClick={() => toggleSort('lastName')} />
                <SortTh label="Email" active={sort?.field === 'email'} dir={sort?.field === 'email' ? sort.dir : null} onClick={() => toggleSort('email')} />
                <SortTh label="Estado" active={sort?.field === 'active'} dir={sort?.field === 'active' ? sort.dir : null} onClick={() => toggleSort('active')} className="col-estado" />
                <th className="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {authors.map(a => (
                <tr key={a.id} className="editorial-table__row">
                  <td>
                    <div className="ed-cell">
                      <div className="ed-cell__icon"><UserCircle2 size={24} strokeWidth={1.4} /></div>
                      <div><div className="ed-cell__name">{a.lastName}, {a.firstName}</div></div>
                    </div>
                  </td>
                  <td>
                    {a.email
                      ? <a className="cell-inline" href={`mailto:${a.email}`}><Mail size={13} strokeWidth={1.8} />{a.email}</a>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="col-estado">
                    <span className={`badge ${a.active ? 'badge--activo' : 'badge--inactivo'}`}>
                      {a.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="col-acciones">
                    <div className="row-actions">
                      <button className="row-actions__btn" type="button" title="Ver detalle"
                        onClick={() => setPanel({ kind: 'detail', author: a })}><Eye size={16} /></button>
                      <button className="row-actions__btn" type="button" title="Editar"
                        onClick={() => setPanel({ kind: 'edit', author: a })}><Pencil size={16} /></button>
                      {a.active && (
                        <button className="row-actions__btn row-actions__btn--danger" type="button" title="Desactivar"
                          onClick={() => handleDeactivate(a)}><Trash2 size={16} /></button>
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
        <Pagination page={page} totalPages={totalPages} first={data?.first ?? true} last={data?.last ?? true} onChange={setPage} />
      )}

      {panel.kind === 'create' && (
        <AuthorForm mode="create" onClose={() => setPanel({ kind: 'closed' })} onSaved={handleSaved}
          onSubmit={(p: AuthorCreateRequest | AuthorUpdateRequest) => authorsApi.create(p as AuthorCreateRequest)} />
      )}
      {panel.kind === 'edit' && (
        <AuthorForm mode="edit" initial={panel.author} onClose={() => setPanel({ kind: 'closed' })} onSaved={handleSaved}
          onSubmit={(p) => authorsApi.update(panel.author.id, p)} />
      )}
      {panel.kind === 'detail' && (
        <AuthorDetail author={panel.author} onClose={() => setPanel({ kind: 'closed' })}
          onEdit={() => setPanel({ kind: 'edit', author: panel.author })} />
      )}
    </div>
  )
}

function SortTh(props: { label: string; active: boolean; dir: SortDir | null; onClick: () => void; className?: string }) {
  return (
    <th onClick={props.onClick} className={`th-sortable ${props.active ? 'th-sortable--active' : ''} ${props.className ?? ''}`}>
      <span className="th-sortable__label">
        {props.label}
        <span className="th-sortable__icon">
          {props.dir === 'asc'  && <ArrowUp size={13} strokeWidth={2.2} />}
          {props.dir === 'desc' && <ArrowDown size={13} strokeWidth={2.2} />}
          {!props.active        && <ArrowUpDown size={13} strokeWidth={1.8} />}
        </span>
      </span>
    </th>
  )
}

function Pagination(props: { page: number; totalPages: number; first: boolean; last: boolean; onChange: (p: number) => void }) {
  const { page, totalPages, first, last, onChange } = props
  const nums = buildPageNumbers(page, totalPages)
  return (
    <nav className="pager" aria-label="Paginación">
      <button className="pager__btn pager__btn--nav" onClick={() => onChange(Math.max(0, page - 1))} disabled={first} type="button">
        <ChevronLeft size={18} strokeWidth={2.2} /><span>Anterior</span>
      </button>
      <div className="pager__numbers">
        {nums.map((n, i) => n === '…'
          ? <span key={`d${i}`} className="pager__dots">…</span>
          : <button key={n} type="button" className={`pager__num ${n === page ? 'pager__num--active' : ''}`} onClick={() => onChange(n)}>{n + 1}</button>)}
      </div>
      <button className="pager__btn pager__btn--nav" onClick={() => onChange(page + 1)} disabled={last} type="button">
        <span>Siguiente</span><ChevronRight size={18} strokeWidth={2.2} />
      </button>
    </nav>
  )
}

function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const pages: (number | '…')[] = [0]
  if (current > 2) pages.push('…')
  const start = Math.max(1, current - 1), end = Math.min(total - 2, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 3) pages.push('…')
  pages.push(total - 1)
  return pages
}
