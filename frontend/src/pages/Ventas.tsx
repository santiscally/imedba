import { useEffect, useState } from 'react'
import {
  Search, Plus, ChevronLeft, ChevronRight,
  ShoppingBag, Coins, ArrowUp, ArrowDown, ArrowUpDown,
  Book as BookIcon, CircleDollarSign, Calendar, Eye, GraduationCap,
} from 'lucide-react'
import { bookSalesApi } from '../api/book-sales'
import type { PageResponse } from '../types/common'
import type { BookSale, BookSaleCreateRequest, RoyaltyLine } from '../types/book-sale'
import EmptyState from '../components/EmptyState'
import BookSaleForm from '../components/BookSaleForm'
import BookSaleDetail from '../components/BookSaleDetail'
import { canWrite } from '../lib/access'
import './Editorial.scss'

const PAGE_SIZE = 10
type Tab = 'ventas' | 'royalties'
type SortDir = 'asc' | 'desc'
type SaleSortField = 'saleDate' | 'totalAmount' | 'quantity'
type SaleSort = { field: SaleSortField; dir: SortDir } | null

type PanelState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'detail'; sale: BookSale }

const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

export default function Ventas() {
  const [tab, setTab] = useState<Tab>('ventas')

  // ── Ventas
  const [query,     setQuery]     = useState('')
  const [debounced, setDebounced] = useState('')
  const [page,      setPage]      = useState(0)
  const [sort,      setSort]      = useState<SaleSort>({ field: 'saleDate', dir: 'desc' })
  const [data,      setData]      = useState<PageResponse<BookSale> | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [reload,    setReload]    = useState(0)
  const [panel,     setPanel]     = useState<PanelState>({ kind: 'closed' })

  // ── Royalties
  const today = new Date()
  const [ryear,  setRyear]  = useState(today.getUTCFullYear())
  const [rmonth, setRmonth] = useState(today.getUTCMonth() + 1)
  const [royalties, setRoyalties] = useState<RoyaltyLine[] | null>(null)
  const [rLoading,  setRLoading]  = useState(false)
  const [rError,    setRError]    = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (tab !== 'ventas') return
    setLoading(true); setError(null)
    bookSalesApi.list({
      q: debounced || undefined, page, size: PAGE_SIZE,
      sort: sort ? `${sort.field},${sort.dir}` : undefined,
    })
      .then(res => { setData(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [tab, debounced, page, sort, reload])

  useEffect(() => {
    if (tab !== 'royalties') return
    setRLoading(true); setRError(null)
    bookSalesApi.royaltiesByPeriod(ryear, rmonth)
      .then(res => { setRoyalties(res); setRLoading(false) })
      .catch((err: Error) => { setRError(err.message); setRLoading(false) })
  }, [tab, ryear, rmonth, reload])

  function toggleSort(field: SaleSortField) {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc')             return { field, dir: 'desc' }
      return null
    })
    setPage(0)
  }

  const total      = data?.totalElements ?? 0
  const totalPages = data?.totalPages    ?? 0
  const sales      = data?.content       ?? []
  const royaltyTotal = (royalties ?? []).reduce((acc, r) => acc + r.royaltyAmount, 0)

  return (
    <div className="editorial">
      <header className="editorial__header">
        <div>
          <h2 className="editorial__title">
            <span className="editorial__title-icon"><ShoppingBag size={22} strokeWidth={2} /></span>
            Ventas
          </h2>
          <p className="editorial__subtitle">
            {tab === 'ventas'
              ? (total > 0 ? `${total} ${total === 1 ? 'venta registrada' : 'ventas registradas'}` : 'Ventas de libros')
              : `Royalties de ${MONTHS[rmonth - 1]} ${ryear}`}
          </p>
        </div>
        {tab === 'ventas' && canWrite('/ventas') && (
          <button className="btn-primary" type="button" onClick={() => setPanel({ kind: 'create' })}>
            <Plus size={16} strokeWidth={2.2} /> Registrar venta
          </button>
        )}
      </header>

      <div className="editorial__tabs" role="tablist">
        <button type="button" className={`editorial__tab ${tab === 'ventas' ? 'editorial__tab--active' : ''}`}
          onClick={() => setTab('ventas')} role="tab" aria-selected={tab === 'ventas'}>
          <ShoppingBag size={15} /> Ventas
        </button>
        <button type="button" className={`editorial__tab ${tab === 'royalties' ? 'editorial__tab--active' : ''}`}
          onClick={() => setTab('royalties')} role="tab" aria-selected={tab === 'royalties'}>
          <Coins size={15} /> Royalties
        </button>
      </div>

      {tab === 'ventas' ? (
        <>
          <div className="editorial__toolbar">
            <div className="search">
              <Search size={16} strokeWidth={1.8} className="search__icon" />
              <input type="text" className="search__input" placeholder="Buscar por libro…"
                value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>

          <div className="editorial__table-wrap">
            {loading && <div className="editorial__loading">Cargando…</div>}
            {!loading && error && <EmptyState icon={ShoppingBag} message="No se pudieron cargar las ventas" hint={error} />}
            {!loading && !error && sales.length === 0 && (
              <EmptyState icon={ShoppingBag} message="Sin resultados"
                hint={debounced ? `No hay ventas para "${debounced}"` : 'No hay ventas registradas.'} />
            )}
            {!loading && !error && sales.length > 0 && (
              <table className="editorial-table">
                <thead>
                  <tr>
                    <th>Libro</th>
                    <SortTh label="Cantidad" active={sort?.field === 'quantity'} dir={sort?.field === 'quantity' ? sort.dir : null} onClick={() => toggleSort('quantity')} className="col-num" />
                    <th className="col-precio">Precio unit.</th>
                    <SortTh label="Total" active={sort?.field === 'totalAmount'} dir={sort?.field === 'totalAmount' ? sort.dir : null} onClick={() => toggleSort('totalAmount')} className="col-precio" />
                    <SortTh label="Fecha" active={sort?.field === 'saleDate'} dir={sort?.field === 'saleDate' ? sort.dir : null} onClick={() => toggleSort('saleDate')} />
                    <th>Tipo</th>
                    <th className="col-acciones">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(s => (
                    <tr key={s.id} className="editorial-table__row">
                      <td>
                        <div className="ed-cell">
                          <div className="ed-cell__icon"><BookIcon size={20} strokeWidth={1.5} /></div>
                          <div><div className="ed-cell__name">{s.bookName ?? '—'}</div></div>
                        </div>
                      </td>
                      <td className="col-num">{s.quantity}</td>
                      <td className="col-precio">{formatPrice(s.unitPrice)}</td>
                      <td className="col-precio">
                        <span className="price"><CircleDollarSign size={13} strokeWidth={1.8} />{formatPrice(s.totalAmount)}</span>
                      </td>
                      <td className="td-date">
                        <span className="cell-inline"><Calendar size={13} strokeWidth={1.8} /> {formatInstantDate(s.saleDate)}</span>
                      </td>
                      <td>
                        {s.studentSale
                          ? <span className="badge badge--pendiente"><GraduationCap size={12} strokeWidth={1.8} /> Alumno</span>
                          : <span className="muted">Lista</span>}
                      </td>
                      <td className="col-acciones">
                        <div className="row-actions">
                          <button className="row-actions__btn" type="button" title="Ver detalle"
                            onClick={() => setPanel({ kind: 'detail', sale: s })}><Eye size={16} /></button>
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
        </>
      ) : (
        <>
          <div className="editorial__toolbar">
            <div className="editorial__period">
              <Calendar size={16} strokeWidth={1.8} />
              <select value={rmonth} onChange={e => setRmonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select value={ryear} onChange={e => setRyear(Number(e.target.value))}>
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {royalties && royalties.length > 0 && (
              <div className="sale-total" style={{ minWidth: 240 }}>
                <span>Total royalties del período</span>
                <span className="sale-total__amount">{formatPrice(royaltyTotal)}</span>
              </div>
            )}
          </div>

          <div className="editorial__table-wrap">
            {rLoading && <div className="editorial__loading">Cargando…</div>}
            {!rLoading && rError && <EmptyState icon={Coins} message="No se pudieron cargar los royalties" hint={rError} />}
            {!rLoading && !rError && (royalties?.length ?? 0) === 0 && (
              <EmptyState icon={Coins} message="Sin royalties"
                hint={`No hay ventas con royalties en ${MONTHS[rmonth - 1]} ${ryear}.`} />
            )}
            {!rLoading && !rError && royalties && royalties.length > 0 && (
              <table className="editorial-table">
                <thead>
                  <tr>
                    <th>Autor</th>
                    <th>Libro</th>
                    <th className="col-num">Royalty %</th>
                    <th className="col-precio">Ventas período</th>
                    <th className="col-precio">Royalty</th>
                  </tr>
                </thead>
                <tbody>
                  {royalties.map(r => (
                    <tr key={`${r.bookId}-${r.authorId}`} className="editorial-table__row">
                      <td><div className="ed-cell__name">{r.lastName}, {r.firstName}</div></td>
                      <td>{r.bookName}</td>
                      <td className="col-num">{r.royaltyPercentage}%</td>
                      <td className="col-precio">{formatPrice(r.totalSales)}</td>
                      <td className="col-precio"><span className="royalty-amount">{formatPrice(r.royaltyAmount)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {panel.kind === 'create' && (
        <BookSaleForm onClose={() => setPanel({ kind: 'closed' })}
          onSaved={() => { setPanel({ kind: 'closed' }); setReload(r => r + 1) }}
          onSubmit={(p: BookSaleCreateRequest) => bookSalesApi.create(p)} />
      )}
      {panel.kind === 'detail' && (
        <BookSaleDetail sale={panel.sale} onClose={() => setPanel({ kind: 'closed' })} />
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

function formatInstantDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
