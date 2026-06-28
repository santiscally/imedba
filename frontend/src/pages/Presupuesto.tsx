import { useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, ChevronLeft, ChevronRight,
  Wallet, ArrowUp, ArrowDown, ArrowUpDown,
  TrendingUp, TrendingDown, Scale,
  CalendarDays, CircleDollarSign, Tag, Eye, RotateCcw, Banknote, Download,
} from 'lucide-react'
import { budgetApi } from '../api/budget'
import type { PageResponse } from '../types/common'
import type {
  BudgetEntry, BudgetSummary, MonthlyFlow,
  EntryType, BudgetCategory,
} from '../types/budget'
import {
  ENTRY_TYPES, ENTRY_TYPE_LABELS,
  BUDGET_CATEGORIES, BUDGET_CATEGORY_LABELS,
  BUDGET_BUSINESS_UNIT_LABELS,
} from '../types/budget'
import { PAYMENT_METHOD_LABELS } from '../types/enrollment'
import { exportToCsv, type CsvColumn } from '../lib/exportCsv'
import { alertError } from '../lib/confirm'
import EmptyState from '../components/EmptyState'
import BudgetEntryForm from '../components/BudgetEntryForm'
import BudgetEntryDetail from '../components/BudgetEntryDetail'
import { canWrite } from '../lib/access'
import './Presupuesto.scss'

const PAGE_SIZE = 10

const MONTHS_FULL = [
  'Enero',   'Febrero', 'Marzo',     'Abril',
  'Mayo',    'Junio',   'Julio',     'Agosto',
  'Septiembre','Octubre','Noviembre','Diciembre',
]
const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

type SortDir   = 'asc' | 'desc'
type SortField = 'entryDate' | 'amount' | 'entryType' | 'category' | 'concept'
type SortState = { field: SortField; dir: SortDir } | null

type TypeFilter = EntryType | 'TODOS'
type CategoryFilter = BudgetCategory | 'TODAS'

type PanelState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'detail'; entry: BudgetEntry }

export default function Presupuesto() {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const [summary,      setSummary]      = useState<BudgetSummary | null>(null)
  const [monthlyFlow,  setMonthlyFlow]  = useState<MonthlyFlow[]>([])
  const [dashLoading,  setDashLoading]  = useState(true)
  const [dashError,    setDashError]    = useState<string | null>(null)

  // ── Tabla de entries
  const [query,        setQuery]        = useState('')
  const [debounced,    setDebounced]    = useState('')
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>('TODOS')
  const [catFilter,    setCatFilter]    = useState<CategoryFilter>('TODAS')
  const [page,         setPage]         = useState(0)
  const [sort,         setSort]         = useState<SortState>({ field: 'entryDate', dir: 'desc' })

  const [data,    setData]    = useState<PageResponse<BudgetEntry> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [reload,  setReload]  = useState(0)

  const [panel, setPanel] = useState<PanelState>({ kind: 'closed' })

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Dashboard fetch
  useEffect(() => {
    setDashLoading(true); setDashError(null)
    Promise.all([
      budgetApi.summary(year, month),
      budgetApi.monthlyFlow(year),
    ])
      .then(([s, f]) => { setSummary(s); setMonthlyFlow(f); setDashLoading(false) })
      .catch((err: Error) => { setDashError(err.message); setDashLoading(false) })
  }, [year, month, reload])

  // Entries fetch
  useEffect(() => {
    setLoading(true); setError(null)
    // Filtramos por mes/año vía from/to (LocalDate)
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to   = `${year}-${String(month).padStart(2, '0')}-${lastDayOfMonth(year, month)}`
    budgetApi.listEntries({
      type:     typeFilter === 'TODOS' ? undefined : typeFilter,
      category: catFilter  === 'TODAS' ? undefined : catFilter,
      from,
      to,
      page,
      size:     PAGE_SIZE,
      sort:     sort ? `${sort.field},${sort.dir}` : undefined,
    })
      .then(res => { setData(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [year, month, typeFilter, catFilter, page, sort, reload])

  const [exporting, setExporting] = useState(false)

  // Exporta a CSV (Excel) los movimientos del período, trayendo todas las filas.
  async function handleExport() {
    setExporting(true)
    try {
      const from = `${year}-${String(month).padStart(2, '0')}-01`
      const to   = `${year}-${String(month).padStart(2, '0')}-${lastDayOfMonth(year, month)}`
      const res = await budgetApi.listEntries({
        type:     typeFilter === 'TODOS' ? undefined : typeFilter,
        category: catFilter  === 'TODAS' ? undefined : catFilter,
        from, to, size: 2000, sort: sort ? `${sort.field},${sort.dir}` : undefined,
      })
      const cols: CsvColumn<BudgetEntry>[] = [
        { label: 'Fecha',        value: e => e.entryDate },
        { label: 'Tipo',         value: e => ENTRY_TYPE_LABELS[e.entryType] },
        { label: 'Categoría',    value: e => BUDGET_CATEGORY_LABELS[e.category] },
        { label: 'Subcategoría', value: e => e.subcategory ?? '' },
        { label: 'Unidad',       value: e => e.businessUnit ? BUDGET_BUSINESS_UNIT_LABELS[e.businessUnit] : '' },
        { label: 'Concepto',     value: e => e.concept },
        { label: 'Monto',        value: e => (e.entryType === 'EXPENSE' ? -e.amount : e.amount) },
        { label: 'Método',       value: e => e.paymentMethod ? PAYMENT_METHOD_LABELS[e.paymentMethod] : '' },
        { label: 'Referencia',   value: e => e.referenceNumber ?? '' },
      ]
      exportToCsv(`presupuesto-${year}-${String(month).padStart(2, '0')}`, res.content, cols)
    } catch (err) {
      alertError('No se pudo exportar', err instanceof Error ? err.message : undefined)
    } finally {
      setExporting(false)
    }
  }

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

  // Filtro client-side por concepto (el backend no lo expone)
  const visibleItems = useMemo(() => {
    const items = data?.content ?? []
    if (!debounced) return items
    const needle = debounced.toLowerCase()
    return items.filter(e =>
      e.concept.toLowerCase().includes(needle) ||
      (e.subcategory?.toLowerCase().includes(needle) ?? false) ||
      (e.referenceNumber?.toLowerCase().includes(needle) ?? false)
    )
  }, [data, debounced])

  const totalPages = data?.totalPages ?? 0
  const periodLabel = `${MONTHS_FULL[month - 1]} ${year}`

  return (
    <div className="presupuesto">
      <header className="presupuesto__header">
        <div className="presupuesto__header-text">
          <h2 className="presupuesto__title">
            <span className="presupuesto__title-icon"><Wallet size={22} strokeWidth={2} /></span>
            Presupuesto
          </h2>
          <p className="presupuesto__subtitle">
            Dashboard financiero · {periodLabel}
          </p>
        </div>
        <div className="presupuesto__header-actions">
          <button className="btn-ghost" type="button" onClick={handleExport} disabled={exporting}>
            <Download size={16} strokeWidth={2} /> {exporting ? 'Exportando…' : 'Exportar'}
          </button>
          {canWrite('/presupuesto') && (
            <button
              className="btn-primary"
              type="button"
              onClick={() => setPanel({ kind: 'create' })}
            >
              <Plus size={16} strokeWidth={2.2} /> Nuevo movimiento
            </button>
          )}
        </div>
      </header>

      <div className="presupuesto__period">
        <button type="button" className="period-nav" onClick={() => stepMonth(-1, year, month, setYear, setMonth)} aria-label="Mes anterior">
          <ChevronLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="period-current">{periodLabel}</div>
        <button type="button" className="period-nav" onClick={() => stepMonth(1, year, month, setYear, setMonth)} aria-label="Mes siguiente">
          <ChevronRight size={18} strokeWidth={2.2} />
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <KpiCard
          icon={TrendingUp}
          label="Ingresos"
          value={summary ? formatPrice(summary.totalIncome) : '—'}
          variant="income"
          loading={dashLoading}
        />
        <KpiCard
          icon={TrendingDown}
          label="Egresos"
          value={summary ? formatPrice(summary.totalExpense) : '—'}
          variant="expense"
          loading={dashLoading}
        />
        <KpiCard
          icon={Scale}
          label="Balance"
          value={summary ? formatPrice(summary.balance) : '—'}
          variant={summary && summary.balance >= 0 ? 'positive' : 'negative'}
          loading={dashLoading}
        />
      </div>

      {/* Gráfico mensual */}
      <div className="chart-card">
        <div className="chart-card__head">
          <h3 className="chart-card__title">Flujo mensual {year}</h3>
          <div className="chart-card__legend">
            <span className="legend-dot legend-dot--income" /> Ingresos
            <span className="legend-dot legend-dot--expense" /> Egresos
          </div>
        </div>
        {dashError
          ? <div className="chart-card__error">{dashError}</div>
          : <FlowChart data={monthlyFlow} selectedMonth={month} onSelect={setMonth} />}
      </div>

      {/* Tabla de entries */}
      <div className="presupuesto__toolbar">
        <div className="search">
          <Search size={16} strokeWidth={1.8} className="search__icon" />
          <input
            type="text"
            placeholder="Buscar por concepto, subcategoría o referencia…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search__input"
          />
        </div>

        <div className="presupuesto__chips">
          {(['TODOS', ...ENTRY_TYPES] as TypeFilter[]).map(opt => (
            <button
              key={opt}
              type="button"
              className={`chip ${typeFilter === opt ? 'chip--active' : ''}`}
              onClick={() => { setTypeFilter(opt); setPage(0) }}
            >
              {opt === 'TODOS' ? 'Todos' : ENTRY_TYPE_LABELS[opt]}
            </button>
          ))}
          <span className="chip-sep" />
          <select
            className="cat-select"
            value={catFilter}
            onChange={e => { setCatFilter(e.target.value as CategoryFilter); setPage(0) }}
          >
            <option value="TODAS">Todas las categorías</option>
            {BUDGET_CATEGORIES.map(c => (
              <option key={c} value={c}>{BUDGET_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="presupuesto__table-wrap">
        {loading && <div className="presupuesto__loading">Cargando…</div>}

        {!loading && error && (
          <EmptyState
            icon={Wallet}
            message="No se pudieron cargar los movimientos"
            hint={error}
          />
        )}

        {!loading && !error && visibleItems.length === 0 && (
          <EmptyState
            icon={Wallet}
            message="Sin movimientos"
            hint={debounced ? `No hay resultados para "${debounced}"` : `No hay movimientos cargados para ${periodLabel}.`}
          />
        )}

        {!loading && !error && visibleItems.length > 0 && (
          <table className="presupuesto-table">
            <thead>
              <tr>
                <SortableTh
                  label="Fecha"
                  field="entryDate"
                  sort={sort}
                  onClick={() => toggleSort('entryDate')}
                  className="col-fecha"
                />
                <SortableTh
                  label="Tipo"
                  field="entryType"
                  sort={sort}
                  onClick={() => toggleSort('entryType')}
                  className="col-tipo"
                />
                <SortableTh
                  label="Concepto"
                  field="concept"
                  sort={sort}
                  onClick={() => toggleSort('concept')}
                />
                <SortableTh
                  label="Categoría"
                  field="category"
                  sort={sort}
                  onClick={() => toggleSort('category')}
                  className="col-cat"
                />
                <th className="col-unidad">Unidad</th>
                <SortableTh
                  label="Monto"
                  field="amount"
                  sort={sort}
                  onClick={() => toggleSort('amount')}
                  className="col-precio"
                />
                <th className="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map(e => (
                <tr key={e.id} className="presupuesto-table__row">
                  <td className="col-fecha">
                    <span className="cell-inline">
                      <CalendarDays size={13} strokeWidth={1.8} />
                      {formatLocalDate(e.entryDate)}
                    </span>
                  </td>
                  <td className="col-tipo">
                    <span className={`pill pill--${e.entryType.toLowerCase()}`}>
                      {ENTRY_TYPE_LABELS[e.entryType]}
                    </span>
                  </td>
                  <td>
                    <div className="concept-cell">
                      <div className="concept-cell__name">
                        {e.concept}
                        {e.recurring && <RotateCcw size={11} strokeWidth={1.8} className="tag-icon" />}
                        {e.cash      && <Banknote  size={11} strokeWidth={1.8} className="tag-icon" />}
                      </div>
                      {e.subcategory && <div className="concept-cell__sub">{e.subcategory}</div>}
                    </div>
                  </td>
                  <td className="col-cat">
                    <span className="cell-inline">
                      <Tag size={12} strokeWidth={1.8} />
                      {BUDGET_CATEGORY_LABELS[e.category]}
                    </span>
                  </td>
                  <td className="col-unidad">
                    {e.businessUnit
                      ? <span className="bu-pill">{BUDGET_BUSINESS_UNIT_LABELS[e.businessUnit]}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="col-precio">
                    <span className={`amount amount--${e.entryType.toLowerCase()}`}>
                      <CircleDollarSign size={13} strokeWidth={1.8} />
                      {e.entryType === 'EXPENSE' ? '−' : '+'}{formatPrice(e.amount)}
                    </span>
                  </td>
                  <td className="col-acciones">
                    <div className="row-actions">
                      <button
                        className="row-actions__btn"
                        type="button"
                        onClick={() => setPanel({ kind: 'detail', entry: e })}
                        aria-label="Ver detalle"
                        title="Ver detalle"
                      >
                        <Eye size={16} />
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
        <BudgetEntryForm
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handleSaved}
          onSubmit={(payload) => budgetApi.createEntry(payload)}
        />
      )}
      {panel.kind === 'detail' && (
        <BudgetEntryDetail
          entry={panel.entry}
          onClose={() => setPanel({ kind: 'closed' })}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// KPI Card
// ═══════════════════════════════════════════════════════════════════════════════
function KpiCard(props: {
  icon:      typeof TrendingUp
  label:     string
  value:     string
  variant:   'income' | 'expense' | 'positive' | 'negative' | 'projected'
  subtitle?: string
  loading?:  boolean
}) {
  const Icon = props.icon
  return (
    <div className={`kpi kpi--${props.variant}`}>
      <div className="kpi__icon"><Icon size={20} strokeWidth={1.8} /></div>
      <div className="kpi__body">
        <div className="kpi__label">{props.label}</div>
        <div className="kpi__value">{props.loading ? '…' : props.value}</div>
        {props.subtitle && <div className="kpi__sub">{props.subtitle}</div>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FlowChart — bar chart simple en SVG (sin dependencias)
// ═══════════════════════════════════════════════════════════════════════════════
function FlowChart(props: {
  data:           MonthlyFlow[]
  selectedMonth:  number
  onSelect:       (m: number) => void
}) {
  const { data, selectedMonth, onSelect } = props
  if (data.length === 0) {
    return <div className="chart-card__empty">Sin datos para el año seleccionado.</div>
  }

  const max = Math.max(1, ...data.flatMap(d => [d.income, d.expense]))
  const W = 1200, H = 220, padTop = 14, padBottom = 32, padX = 24
  const innerW = W - padX * 2
  const innerH = H - padTop - padBottom
  const slot = innerW / 12
  const barW = (slot - 14) / 2

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="chart__svg">
        {/* eje y - 4 líneas */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = padTop + innerH * (1 - t)
          return (
            <g key={i}>
              <line x1={padX} y1={y} x2={W - padX} y2={y} className="chart__grid" />
              <text x={padX - 6} y={y + 3} className="chart__y-label">{compactPrice(max * t)}</text>
            </g>
          )
        })}

        {data.map((d, i) => {
          const xCenter = padX + slot * i + slot / 2
          const incomeH  = innerH * (d.income  / max)
          const expenseH = innerH * (d.expense / max)
          const isSel = (i + 1) === selectedMonth
          return (
            <g key={i} className={`chart__bar-group ${isSel ? 'chart__bar-group--sel' : ''}`}
               onClick={() => onSelect(i + 1)}>
              <rect className="chart__hover" x={padX + slot * i} y={padTop} width={slot} height={innerH} />
              <rect
                className="chart__bar chart__bar--income"
                x={xCenter - barW - 3}
                y={padTop + innerH - incomeH}
                width={barW}
                height={incomeH}
              />
              <rect
                className="chart__bar chart__bar--expense"
                x={xCenter + 3}
                y={padTop + innerH - expenseH}
                width={barW}
                height={expenseH}
              />
              <text x={xCenter} y={H - 12} className={`chart__x-label ${isSel ? 'chart__x-label--sel' : ''}`}>
                {MONTHS_SHORT[i]}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sortable & pagination
// ═══════════════════════════════════════════════════════════════════════════════
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
  pages.push(0)
  if (current > 2) pages.push('…')
  const start = Math.max(1, current - 1)
  const end   = Math.min(total - 2, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 3) pages.push('…')
  pages.push(total - 1)
  return pages
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════
function stepMonth(
  delta: number, year: number, month: number,
  setYear: (n: number) => void, setMonth: (n: number) => void,
) {
  const total = (month - 1) + delta
  if (total < 0) { setYear(year - 1); setMonth(12) }
  else if (total > 11) { setYear(year + 1); setMonth(1) }
  else setMonth(total + 1)
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0).getDate()
  return String(d).padStart(2, '0')
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)
}

function compactPrice(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`
  return String(Math.round(n))
}

function formatLocalDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1)
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
