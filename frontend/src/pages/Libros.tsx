import { useEffect, useState } from 'react'
import {
  Search, Plus, ChevronLeft, ChevronRight,
  Book as BookIcon, ArrowUp, ArrowDown, ArrowUpDown,
  Tag, CircleDollarSign, Boxes, Eye, Pencil, Trash2, Download,
} from 'lucide-react'
import { booksApi } from '../api/books'
import type { PageResponse } from '../types/common'
import type { Book, BookCreateRequest, BookUpdateRequest } from '../types/book'
import EmptyState from '../components/EmptyState'
import BookForm from '../components/BookForm'
import BookDetail from '../components/BookDetail'
import { confirmAction, alertError, toastSuccess } from '../lib/confirm'
import { canWrite } from '../lib/access'
import { exportToCsv, dateStamp } from '../lib/exportCsv'
import './Editorial.scss'

const PAGE_SIZE = 10
type SortDir   = 'asc' | 'desc'
type SortField = 'name' | 'specialty' | 'salePrice' | 'stockQuantity'
type SortState = { field: SortField; dir: SortDir } | null

type PanelState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit';   book: Book }
  | { kind: 'detail'; book: Book }

export default function Libros() {
  const [query,     setQuery]     = useState('')
  const [debounced, setDebounced] = useState('')
  const [page,      setPage]      = useState(0)
  const [sort,      setSort]      = useState<SortState>({ field: 'name', dir: 'asc' })

  const [data,    setData]    = useState<PageResponse<Book> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [reload,  setReload]  = useState(0)

  const [panel,     setPanel]     = useState<PanelState>({ kind: 'closed' })
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setLoading(true); setError(null)
    booksApi.list({
      q:      debounced || undefined,
      active: true,
      page,
      size:   PAGE_SIZE,
      sort:   sort ? `${sort.field},${sort.dir}` : undefined,
    })
      .then(res => { setData(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [debounced, page, sort, reload])

  const total      = data?.totalElements ?? 0
  const totalPages = data?.totalPages    ?? 0
  const books      = data?.content       ?? []

  function toggleSort(field: SortField) {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc')             return { field, dir: 'desc' }
      return null
    })
    setPage(0)
  }

  function handleSaved() { setPanel({ kind: 'closed' }); setReload(r => r + 1) }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await booksApi.list({
        q:      debounced || undefined,
        active: true,
        size:   2000,
        sort:   sort ? `${sort.field},${sort.dir}` : 'name,asc',
      })
      exportToCsv(`libros-${dateStamp()}`, res.content, [
        { label: 'Nombre',           value: b => b.name },
        { label: 'Código',           value: b => b.code ?? '' },
        { label: 'Especialidad',     value: b => b.specialty ?? '' },
        { label: 'Formato',          value: b => b.format ?? '' },
        { label: 'Edición',          value: b => b.edition ?? '' },
        { label: 'Páginas',          value: b => b.pages ?? '' },
        { label: 'Precio venta',     value: b => b.salePrice },
        { label: 'Descuento alumno %', value: b => b.studentDiscountPct ?? '' },
        { label: 'Costo unidad',     value: b => b.costPerUnit ?? '' },
        { label: 'Stock',            value: b => b.stockQuantity ?? '' },
        { label: 'Sucursal',         value: b => b.branch ?? '' },
        { label: 'Autores',          value: b => b.authors.map(a => `${a.lastName} ${a.firstName} (${a.royaltyPercentage}%)`).join(' | ') },
      ])
    } catch (err) {
      alertError('No se pudo exportar', err instanceof Error ? err.message : undefined)
    } finally { setExporting(false) }
  }

  async function handleDeactivate(b: Book) {
    const ok = await confirmAction({
      title: '¿Eliminar libro?', text: `"${b.name}" dejará de figurar en el catálogo.`,
      icon: 'warning', danger: true, confirmText: 'Sí, eliminar',
    })
    if (!ok) return
    try {
      await booksApi.deactivate(b.id)
      toastSuccess('Libro eliminado')
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudo eliminar', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <div className="editorial">
      <header className="editorial__header">
        <div>
          <h2 className="editorial__title">
            <span className="editorial__title-icon"><BookIcon size={22} strokeWidth={2} /></span>
            Libros
          </h2>
          <p className="editorial__subtitle">
            {total > 0 ? `${total} ${total === 1 ? 'libro' : 'libros'} en catálogo` : 'Catálogo editorial'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost" type="button" onClick={handleExport} disabled={exporting}>
            <Download size={16} strokeWidth={2} /> {exporting ? 'Exportando…' : 'Exportar'}
          </button>
          {canWrite('/libros') && (
            <button className="btn-primary" type="button" onClick={() => setPanel({ kind: 'create' })}>
              <Plus size={16} strokeWidth={2.2} /> Nuevo libro
            </button>
          )}
        </div>
      </header>

      <div className="editorial__toolbar">
        <div className="search">
          <Search size={16} strokeWidth={1.8} className="search__icon" />
          <input type="text" className="search__input" placeholder="Buscar por nombre, código o especialidad…"
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="editorial__table-wrap">
        {loading && <div className="editorial__loading">Cargando…</div>}
        {!loading && error && <EmptyState icon={BookIcon} message="No se pudieron cargar los libros" hint={error} />}
        {!loading && !error && books.length === 0 && (
          <EmptyState icon={BookIcon} message="Sin resultados"
            hint={debounced ? `No hay libros para "${debounced}"` : 'No hay libros cargados.'} />
        )}
        {!loading && !error && books.length > 0 && (
          <table className="editorial-table">
            <thead>
              <tr>
                <SortTh label="Libro" active={sort?.field === 'name'} dir={sort?.field === 'name' ? sort.dir : null} onClick={() => toggleSort('name')} />
                <SortTh label="Especialidad" active={sort?.field === 'specialty'} dir={sort?.field === 'specialty' ? sort.dir : null} onClick={() => toggleSort('specialty')} />
                <th>Autores</th>
                <SortTh label="Precio" active={sort?.field === 'salePrice'} dir={sort?.field === 'salePrice' ? sort.dir : null} onClick={() => toggleSort('salePrice')} className="col-precio" />
                <SortTh label="Stock" active={sort?.field === 'stockQuantity'} dir={sort?.field === 'stockQuantity' ? sort.dir : null} onClick={() => toggleSort('stockQuantity')} className="col-num" />
                <th className="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {books.map(b => (
                <tr key={b.id} className="editorial-table__row">
                  <td>
                    <div className="ed-cell">
                      <div className="ed-cell__icon"><BookIcon size={20} strokeWidth={1.5} /></div>
                      <div>
                        <div className="ed-cell__name">
                          {b.name}
                          {b.format && (
                            <span className={`badge badge--${b.format === 'ANILLADO' ? 'suspendida' : 'activo'}`}
                                  style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
                              {b.format === 'ANILLADO' ? 'Anillado' : 'Tradicional'}
                            </span>
                          )}
                        </div>
                        {b.code && <div className="ed-cell__sub"><Tag size={12} strokeWidth={1.8} /> {b.code}</div>}
                      </div>
                    </div>
                  </td>
                  <td>{b.specialty ?? <span className="muted">—</span>}</td>
                  <td>
                    {b.authors.length === 0
                      ? <span className="muted">—</span>
                      : (
                        <div className="ed-authors">
                          {b.authors.map(a => (
                            <span key={a.authorId} className="ed-author-chip">
                              {a.lastName} <strong>{a.royaltyPercentage}%</strong>
                            </span>
                          ))}
                        </div>
                      )}
                  </td>
                  <td className="col-precio">
                    <span className="price"><CircleDollarSign size={13} strokeWidth={1.8} />{formatPrice(b.salePrice)}</span>
                  </td>
                  <td className="col-num">
                    <span className={`ed-stock ${b.stockQuantity === 0 ? 'ed-stock--zero' : ''}`}>
                      <Boxes size={13} strokeWidth={1.8} />{b.stockQuantity ?? 0}
                    </span>
                  </td>
                  <td className="col-acciones">
                    <div className="row-actions">
                      <button className="row-actions__btn" type="button" title="Ver detalle"
                        onClick={() => setPanel({ kind: 'detail', book: b })}><Eye size={16} /></button>
                      {canWrite('/libros') && (
                        <>
                          <button className="row-actions__btn" type="button" title="Editar"
                            onClick={() => setPanel({ kind: 'edit', book: b })}><Pencil size={16} /></button>
                          <button className="row-actions__btn row-actions__btn--danger" type="button" title="Eliminar"
                            onClick={() => handleDeactivate(b)}><Trash2 size={16} /></button>
                        </>
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
        <BookForm mode="create" onClose={() => setPanel({ kind: 'closed' })} onSaved={handleSaved}
          onSubmit={(p: BookCreateRequest | BookUpdateRequest) => booksApi.create(p as BookCreateRequest)} />
      )}
      {panel.kind === 'edit' && (
        <BookForm mode="edit" initial={panel.book} onClose={() => setPanel({ kind: 'closed' })} onSaved={handleSaved}
          onSubmit={(p) => booksApi.update(panel.book.id, p)} />
      )}
      {panel.kind === 'detail' && (
        <BookDetail book={panel.book} onClose={() => setPanel({ kind: 'closed' })}
          onEdit={() => setPanel({ kind: 'edit', book: panel.book })}
          onChanged={(b) => { setReload(r => r + 1); setPanel(p => p.kind === 'detail' ? { kind: 'detail', book: b } : p) }} />
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

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}
