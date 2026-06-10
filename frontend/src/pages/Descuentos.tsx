import { useEffect, useState } from 'react'
import {
  Search, Plus, ChevronLeft, ChevronRight,
  TicketPercent, ArrowUp, ArrowDown, ArrowUpDown,
  CalendarDays, CalendarClock, Percent, CircleDollarSign,
  Eye, Pencil, Download,
} from 'lucide-react'
import { discountCampaignsApi } from '../api/discount-campaigns'
import type { PageResponse } from '../types/common'
import type { DiscountCampaign, DiscountCampaignCreateRequest } from '../types/discount-campaign'
import { DISCOUNT_TYPE_LABELS } from '../types/discount-campaign'
import EmptyState from '../components/EmptyState'
import DiscountCampaignForm from '../components/DiscountCampaignForm'
import DiscountCampaignDetail from '../components/DiscountCampaignDetail'
import { canWrite } from '../lib/access'
import { exportToCsv, dateStamp } from '../lib/exportCsv'
import { alertError } from '../lib/confirm'
import './Descuentos.scss'

const PAGE_SIZE = 10

type SortDir   = 'asc' | 'desc'
type SortField = 'name' | 'discountType' | 'discountValue' | 'startDate' | 'endDate'
type SortState = { field: SortField; dir: SortDir } | null

type PanelState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit';     campaign: DiscountCampaign }
  | { kind: 'detail';   campaign: DiscountCampaign }

export default function Descuentos() {
  const [query,     setQuery]     = useState('')
  const [debounced, setDebounced] = useState('')
  const [page,      setPage]      = useState(0)
  const [sort,      setSort]      = useState<SortState>({ field: 'name', dir: 'asc' })

  const [data,    setData]    = useState<PageResponse<DiscountCampaign> | null>(null)
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
    discountCampaignsApi.list({
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
  const campaigns  = data?.content       ?? []

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

  async function handleExport() {
    setExporting(true)
    try {
      const res = await discountCampaignsApi.list({
        q:      debounced || undefined,
        active: true,
        size:   2000,
        sort:   sort ? `${sort.field},${sort.dir}` : 'name,asc',
      })
      exportToCsv(`descuentos-${dateStamp()}`, res.content, [
        { label: 'Nombre',         value: c => c.name },
        { label: 'Tipo',           value: c => DISCOUNT_TYPE_LABELS[c.discountType] },
        { label: 'Valor',          value: c => c.discountValue },
        { label: 'Vigencia desde', value: c => c.startDate ?? '' },
        { label: 'Vigencia hasta', value: c => c.endDate   ?? '' },
        { label: 'Descripción',    value: c => c.description ?? '' },
      ])
    } catch (err) {
      alertError('No se pudo exportar', err instanceof Error ? err.message : undefined)
    } finally { setExporting(false) }
  }

  return (
    <div className="descuentos">
      <header className="descuentos__header">
        <div className="descuentos__header-text">
          <h2 className="descuentos__title">
            <span className="descuentos__title-icon"><TicketPercent size={22} strokeWidth={2} /></span>
            Descuentos
          </h2>
          <p className="descuentos__subtitle">
            {total > 0
              ? `${total} ${total === 1 ? 'campaña configurada' : 'campañas configuradas'}`
              : 'Campañas de descuento aplicables a inscripciones'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost" type="button" onClick={handleExport} disabled={exporting}>
            <Download size={16} strokeWidth={2} /> {exporting ? 'Exportando…' : 'Exportar'}
          </button>
          {canWrite('/descuentos') && (
            <button
              className="btn-primary"
              type="button"
              onClick={() => setPanel({ kind: 'create' })}
            >
              <Plus size={16} strokeWidth={2.2} /> Nueva campaña
            </button>
          )}
        </div>
      </header>

      <div className="descuentos__toolbar">
        <div className="search">
          <Search size={16} strokeWidth={1.8} className="search__icon" />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search__input"
          />
        </div>
      </div>

      <div className="descuentos__table-wrap">
        {loading && <div className="descuentos__loading">Cargando…</div>}

        {!loading && error && (
          <EmptyState
            icon={TicketPercent}
            message="No se pudieron cargar las campañas"
            hint={error}
          />
        )}

        {!loading && !error && campaigns.length === 0 && (
          <EmptyState
            icon={TicketPercent}
            message="Sin resultados"
            hint={debounced ? `No hay campañas para "${debounced}"` : 'No hay campañas cargadas.'}
          />
        )}

        {!loading && !error && campaigns.length > 0 && (
          <table className="descuentos-table">
            <thead>
              <tr>
                <SortableTh
                  label="Nombre"
                  field="name"
                  sort={sort}
                  onClick={() => toggleSort('name')}
                />
                <SortableTh
                  label="Tipo"
                  field="discountType"
                  sort={sort}
                  onClick={() => toggleSort('discountType')}
                  className="col-tipo"
                />
                <SortableTh
                  label="Valor"
                  field="discountValue"
                  sort={sort}
                  onClick={() => toggleSort('discountValue')}
                  className="col-valor"
                />
                <SortableTh
                  label="Vigencia desde"
                  field="startDate"
                  sort={sort}
                  onClick={() => toggleSort('startDate')}
                  className="col-fecha"
                />
                <SortableTh
                  label="Vigencia hasta"
                  field="endDate"
                  sort={sort}
                  onClick={() => toggleSort('endDate')}
                  className="col-fecha"
                />
                <th className="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} className="descuentos-table__row">
                  <td>
                    <div className="campaign-cell">
                      <div className="campaign-cell__icon">
                        <TicketPercent size={20} strokeWidth={1.5} />
                      </div>
                      <div className="campaign-cell__text">
                        <div className="campaign-cell__name">{c.name}</div>
                        {c.description && (
                          <div className="campaign-cell__desc">{c.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="col-tipo">
                    <span className={`pill pill--${c.discountType.toLowerCase()}`}>
                      {DISCOUNT_TYPE_LABELS[c.discountType]}
                    </span>
                  </td>
                  <td className="col-valor">
                    <span className="value">
                      {c.discountType === 'PERCENTAGE'
                        ? <><Percent size={13} strokeWidth={1.8} />{c.discountValue}</>
                        : <><CircleDollarSign size={13} strokeWidth={1.8} />{formatPrice(c.discountValue)}</>}
                    </span>
                  </td>
                  <td className="col-fecha">
                    <span className="cell-inline">
                      <CalendarDays size={13} strokeWidth={1.8} />
                      {formatDate(c.startDate)}
                    </span>
                  </td>
                  <td className="col-fecha">
                    <span className="cell-inline">
                      <CalendarClock size={13} strokeWidth={1.8} />
                      {formatDate(c.endDate)}
                    </span>
                  </td>
                  <td className="col-acciones">
                    <div className="row-actions">
                      <button
                        className="row-actions__btn"
                        type="button"
                        onClick={() => setPanel({ kind: 'detail', campaign: c })}
                        aria-label="Ver detalle"
                        title="Ver detalle"
                      >
                        <Eye size={16} />
                      </button>
                      {canWrite('/descuentos') && (
                        <button
                          className="row-actions__btn"
                          type="button"
                          onClick={() => setPanel({ kind: 'edit', campaign: c })}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil size={16} />
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
        <DiscountCampaignForm
          mode="create"
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handleSaved}
          onSubmit={(payload: DiscountCampaignCreateRequest) => discountCampaignsApi.create(payload)}
        />
      )}
      {panel.kind === 'edit' && (
        <DiscountCampaignForm
          mode="edit"
          initial={panel.campaign}
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handleSaved}
          onSubmit={(payload) => discountCampaignsApi.update(panel.campaign.id, payload)}
        />
      )}
      {panel.kind === 'detail' && (
        <DiscountCampaignDetail
          campaign={panel.campaign}
          onClose={() => setPanel({ kind: 'closed' })}
          onEdit={() => setPanel({ kind: 'edit', campaign: panel.campaign })}
        />
      )}
    </div>
  )
}

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
  pages.push(0)
  if (current > 2) pages.push('…')
  const start = Math.max(1, current - 1)
  const end   = Math.min(total - 2, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 3) pages.push('…')
  pages.push(total - 1)
  return pages
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1)
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
