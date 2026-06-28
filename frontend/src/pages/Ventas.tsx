import { useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, ChevronLeft, ChevronRight, ChevronDown,
  ShoppingBag, Coins, ArrowUp, ArrowDown, ArrowUpDown,
  Book as BookIcon, CircleDollarSign, Calendar, Eye, GraduationCap,
  Download, User as UserIcon,
} from 'lucide-react'
import { bookSalesApi } from '../api/book-sales'
import type { PageResponse } from '../types/common'
import type { BookSale, BookSaleCreateRequest, RoyaltyLine } from '../types/book-sale'
import EmptyState from '../components/EmptyState'
import BookSaleForm from '../components/BookSaleForm'
import BookSaleDetail from '../components/BookSaleDetail'
import { canWrite } from '../lib/access'
import { hasAuthority } from '../lib/auth'
import { exportToCsv, dateStamp } from '../lib/exportCsv'
import { alertError } from '../lib/confirm'
import './Editorial.scss'

const PAGE_SIZE = 10
type Tab = 'ventas' | 'royalties'
type SortDir = 'asc' | 'desc'
type SaleSortField = 'saleDate' | 'totalAmount' | 'quantity'
type SaleSort = { field: SaleSortField; dir: SortDir } | null

type PeriodType = 'mes' | 'trimestre' | 'semestre' | 'anio'

type PanelState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'detail'; sale: BookSale }

const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const PERIOD_LABELS: Record<PeriodType, string> = {
  mes:       'Mes',
  trimestre: 'Trimestre',
  semestre:  'Semestre',
  anio:      'Año',
}

interface AuthorGroup {
  authorId:     string
  firstName:    string
  lastName:     string
  totalSales:   number
  totalRoyalty: number
  books:        Array<{ bookId: string; bookName: string | null; royaltyPercentage: number; totalSales: number; royaltyAmount: number }>
}

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

  // ── Royalties — período por defecto: semestre actual (Nico paga cada 6 meses)
  const today = new Date()
  const [periodType, setPeriodType] = useState<PeriodType>('semestre')
  const [pyear,      setPyear]      = useState(today.getFullYear())
  const [pmonth,     setPmonth]     = useState(today.getMonth() + 1)
  const [pquarter,   setPquarter]   = useState(Math.floor(today.getMonth() / 3) + 1)
  const [psemester,  setPsemester]  = useState(today.getMonth() < 6 ? 1 : 2)

  const [royalties,      setRoyalties]      = useState<RoyaltyLine[] | null>(null)
  const [rLoading,       setRLoading]       = useState(false)
  const [rError,         setRError]         = useState<string | null>(null)
  const [authorSearch,   setAuthorSearch]   = useState('')
  const [expandedAuthors, setExpandedAuthors] = useState<Set<string>>(new Set())

  const [exportingSales, setExportingSales] = useState(false)

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

  // Lista de (year, month) a pedir según el tipo de período
  const periodMonths = useMemo<Array<{ year: number; month: number }>>(() => {
    switch (periodType) {
      case 'mes':
        return [{ year: pyear, month: pmonth }]
      case 'trimestre': {
        const start = (pquarter - 1) * 3 + 1
        return [0, 1, 2].map(i => ({ year: pyear, month: start + i }))
      }
      case 'semestre': {
        const start = (psemester - 1) * 6 + 1
        return [0, 1, 2, 3, 4, 5].map(i => ({ year: pyear, month: start + i }))
      }
      case 'anio':
        return Array.from({ length: 12 }, (_, i) => ({ year: pyear, month: i + 1 }))
    }
  }, [periodType, pyear, pmonth, pquarter, psemester])

  useEffect(() => {
    if (tab !== 'royalties') return
    setRLoading(true); setRError(null)
    Promise.all(periodMonths.map(p => bookSalesApi.royaltiesByPeriod(p.year, p.month)))
      .then(results => { setRoyalties(results.flat()); setRLoading(false) })
      .catch((err: Error) => { setRError(err.message); setRLoading(false) })
  }, [tab, periodMonths, reload])

  // Agrupar por autora (sumando líneas que se repiten en distintos meses)
  const authorsGrouped = useMemo<AuthorGroup[]>(() => {
    if (!royalties) return []
    const map = new Map<string, AuthorGroup>()
    for (const r of royalties) {
      let g = map.get(r.authorId)
      if (!g) {
        g = {
          authorId: r.authorId, firstName: r.firstName, lastName: r.lastName,
          totalSales: 0, totalRoyalty: 0, books: [],
        }
        map.set(r.authorId, g)
      }
      const existing = g.books.find(b => b.bookId === r.bookId)
      if (existing) {
        existing.totalSales    += r.totalSales
        existing.royaltyAmount += r.royaltyAmount
      } else {
        g.books.push({
          bookId: r.bookId, bookName: r.bookName,
          royaltyPercentage: r.royaltyPercentage,
          totalSales: r.totalSales, royaltyAmount: r.royaltyAmount,
        })
      }
      g.totalSales    += r.totalSales
      g.totalRoyalty  += r.royaltyAmount
    }

    const needle = authorSearch.trim().toLowerCase()
    let groups = Array.from(map.values())
    if (needle) {
      groups = groups.filter(g => `${g.firstName} ${g.lastName}`.toLowerCase().includes(needle))
    }
    for (const g of groups) g.books.sort((a, b) => b.royaltyAmount - a.royaltyAmount)
    return groups.sort((a, b) => b.totalRoyalty - a.totalRoyalty)
  }, [royalties, authorSearch])

  const grandTotal = authorsGrouped.reduce((acc, g) => acc + g.totalRoyalty, 0)

  function toggleSort(field: SaleSortField) {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc')             return { field, dir: 'desc' }
      return null
    })
    setPage(0)
  }

  function toggleAuthor(authorId: string) {
    setExpandedAuthors(prev => {
      const next = new Set(prev)
      if (next.has(authorId)) next.delete(authorId)
      else next.add(authorId)
      return next
    })
  }

  function expandAll() { setExpandedAuthors(new Set(authorsGrouped.map(g => g.authorId))) }
  function collapseAll() { setExpandedAuthors(new Set()) }

  function periodSlug(): string {
    switch (periodType) {
      case 'mes':       return `${MONTHS[pmonth - 1]}-${pyear}`
      case 'trimestre': return `Q${pquarter}-${pyear}`
      case 'semestre':  return `S${psemester}-${pyear}`
      case 'anio':      return `${pyear}`
    }
  }

  function periodTitle(): string {
    switch (periodType) {
      case 'mes':       return `${MONTHS[pmonth - 1]} ${pyear}`
      case 'trimestre': return `Q${pquarter} ${pyear} (${MONTHS[(pquarter - 1) * 3]}–${MONTHS[(pquarter - 1) * 3 + 2]})`
      case 'semestre':  return `Semestre ${psemester} ${pyear} (${psemester === 1 ? 'ene–jun' : 'jul–dic'})`
      case 'anio':      return `Año ${pyear}`
    }
  }

  async function handleExportSales() {
    setExportingSales(true)
    try {
      const res = await bookSalesApi.list({
        q: debounced || undefined,
        size: 2000,
        sort: sort ? `${sort.field},${sort.dir}` : 'saleDate,desc',
      })
      exportToCsv(`ventas-${dateStamp()}`, res.content, [
        { label: 'Libro',        value: s => s.bookName ?? '' },
        { label: 'Cantidad',     value: s => s.quantity },
        { label: 'Precio unit.', value: s => s.unitPrice },
        { label: 'Total',        value: s => s.totalAmount },
        { label: 'Fecha',        value: s => formatInstantDate(s.saleDate) },
        { label: 'Tipo',         value: s => s.studentSale ? 'Alumno' : 'Lista' },
      ])
    } catch (err) {
      alertError('No se pudo exportar', err instanceof Error ? err.message : undefined)
    } finally { setExportingSales(false) }
  }

  function handleExportRoyalties() {
    const rows: Array<{ author: string; book: string; pct: number; sales: number; royalty: number }> = []
    for (const g of authorsGrouped) {
      for (const b of g.books) {
        rows.push({
          author:  `${g.lastName}, ${g.firstName}`,
          book:    b.bookName ?? '—',
          pct:     b.royaltyPercentage,
          sales:   b.totalSales,
          royalty: b.royaltyAmount,
        })
      }
    }
    if (rows.length === 0) return
    exportToCsv(`autorias-${periodSlug()}-${dateStamp()}`, rows, [
      { label: 'Autora',             value: r => r.author },
      { label: 'Libro',              value: r => r.book },
      { label: 'Autoría %',          value: r => `${r.pct}%` },
      { label: 'Ventas del período', value: r => r.sales },
      { label: 'Autoría',            value: r => r.royalty },
    ])
  }

  const total      = data?.totalElements ?? 0
  const totalPages = data?.totalPages    ?? 0
  const sales      = data?.content       ?? []

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
              : `Autorías — ${periodTitle()}`}
          </p>
        </div>
        {tab === 'ventas' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-ghost" type="button" onClick={handleExportSales} disabled={exportingSales}>
              <Download size={16} strokeWidth={2} /> {exportingSales ? 'Exportando…' : 'Exportar'}
            </button>
            {canWrite('/ventas') && (
              <button className="btn-primary" type="button" onClick={() => setPanel({ kind: 'create' })}>
                <Plus size={16} strokeWidth={2.2} /> Registrar venta
              </button>
            )}
          </div>
        )}
      </header>

      <div className="editorial__tabs" role="tablist">
        <button type="button" className={`editorial__tab ${tab === 'ventas' ? 'editorial__tab--active' : ''}`}
          onClick={() => setTab('ventas')} role="tab" aria-selected={tab === 'ventas'}>
          <ShoppingBag size={15} /> Ventas
        </button>
        {/* Reunión 12-jun §6: vendedora NO ve autorías. Lo gateamos con
            authors:read — que tienen ADMIN/EDITORIAL/VIEWER pero no vendedora. */}
        {hasAuthority('authors:read') && (
          <button type="button" className={`editorial__tab ${tab === 'royalties' ? 'editorial__tab--active' : ''}`}
            onClick={() => setTab('royalties')} role="tab" aria-selected={tab === 'royalties'}>
            <Coins size={15} /> Autorías
          </button>
        )}
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
          <div className="editorial__toolbar royalty-toolbar">
            <div className="royalty-period">
              <Calendar size={16} strokeWidth={1.8} />
              <select value={periodType} onChange={e => setPeriodType(e.target.value as PeriodType)}>
                {(['mes','trimestre','semestre','anio'] as PeriodType[]).map(p => (
                  <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                ))}
              </select>

              {periodType === 'mes' && (
                <select value={pmonth} onChange={e => setPmonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              )}
              {periodType === 'trimestre' && (
                <select value={pquarter} onChange={e => setPquarter(Number(e.target.value))}>
                  <option value={1}>Q1 (ene–mar)</option>
                  <option value={2}>Q2 (abr–jun)</option>
                  <option value={3}>Q3 (jul–sep)</option>
                  <option value={4}>Q4 (oct–dic)</option>
                </select>
              )}
              {periodType === 'semestre' && (
                <select value={psemester} onChange={e => setPsemester(Number(e.target.value))}>
                  <option value={1}>S1 (ene–jun)</option>
                  <option value={2}>S2 (jul–dic)</option>
                </select>
              )}

              <select value={pyear} onChange={e => setPyear(Number(e.target.value))}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="search royalty-toolbar__search">
              <Search size={16} strokeWidth={1.8} className="search__icon" />
              <input type="text" className="search__input" placeholder="Buscar autora…"
                value={authorSearch} onChange={e => setAuthorSearch(e.target.value)} />
            </div>

            <button className="btn-ghost" type="button" onClick={handleExportRoyalties}
              disabled={authorsGrouped.length === 0}>
              <Download size={15} strokeWidth={2} /> Exportar
            </button>
          </div>

          {!rLoading && !rError && authorsGrouped.length > 0 && (
            <div className="royalty-summary">
              <div className="royalty-summary__total">
                <span>Total a pagar — {periodTitle()}</span>
                <strong>{formatPrice(grandTotal)}</strong>
              </div>
              <div className="royalty-summary__actions">
                <button type="button" className="link-btn" onClick={expandAll}>Expandir todo</button>
                <span className="muted">·</span>
                <button type="button" className="link-btn" onClick={collapseAll}>Colapsar todo</button>
              </div>
            </div>
          )}

          <div className="editorial__table-wrap">
            {rLoading && <div className="editorial__loading">Cargando…</div>}
            {!rLoading && rError && <EmptyState icon={Coins} message="No se pudieron cargar las autorías" hint={rError} />}
            {!rLoading && !rError && authorsGrouped.length === 0 && (
              <EmptyState icon={Coins} message="Sin autorías"
                hint={authorSearch
                  ? `Ninguna autora coincide con "${authorSearch}".`
                  : `No hay ventas con autorías en ${periodTitle()}.`} />
            )}
            {!rLoading && !rError && authorsGrouped.length > 0 && (
              <div className="royalty-list">
                {authorsGrouped.map(g => {
                  const open = expandedAuthors.has(g.authorId)
                  return (
                    <div key={g.authorId} className={`royalty-group ${open ? 'royalty-group--open' : ''}`}>
                      <button type="button" className="royalty-group__header" onClick={() => toggleAuthor(g.authorId)}>
                        <span className="royalty-group__chevron">
                          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                        <span className="royalty-group__name">
                          <UserIcon size={14} strokeWidth={1.8} />
                          {g.lastName}, {g.firstName}
                        </span>
                        <span className="royalty-group__count muted">
                          {g.books.length} {g.books.length === 1 ? 'libro' : 'libros'}
                        </span>
                        <span className="royalty-group__sales muted">
                          {formatPrice(g.totalSales)} en ventas
                        </span>
                        <span className="royalty-group__total">
                          {formatPrice(g.totalRoyalty)}
                        </span>
                      </button>
                      {open && (
                        <table className="royalty-books">
                          <thead>
                            <tr>
                              <th>Libro</th>
                              <th className="col-num">Autoría %</th>
                              <th className="col-precio">Ventas</th>
                              <th className="col-precio">Autoría</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.books.map(b => (
                              <tr key={b.bookId}>
                                <td>{b.bookName ?? '—'}</td>
                                <td className="col-num">{b.royaltyPercentage}%</td>
                                <td className="col-precio">{formatPrice(b.totalSales)}</td>
                                <td className="col-precio"><span className="royalty-amount">{formatPrice(b.royaltyAmount)}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )
                })}
              </div>
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
