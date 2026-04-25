import { useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, ChevronLeft, ChevronRight,
  CreditCard, Receipt, ArrowUp, ArrowDown, ArrowUpDown,
  UserCircle2, GraduationCap, CircleDollarSign,
  Eye, Hash, Calendar, BadgeCheck,
} from 'lucide-react'
import { installmentsApi } from '../api/installments'
import { paymentsApi } from '../api/payments'
import type { PageResponse } from '../types/common'
import type { Installment, InstallmentStatus } from '../types/installment'
import { INSTALLMENT_STATUSES, INSTALLMENT_STATUS_LABELS } from '../types/installment'
import type { Payment, PaymentCreateRequest } from '../types/payment'
import { PAYMENT_METHOD_LABELS } from '../types/enrollment'
import EmptyState from '../components/EmptyState'
import PaymentForm from '../components/PaymentForm'
import PaymentDetail from '../components/PaymentDetail'
import './Cuotas.scss'

const PAGE_SIZE = 10

type Tab = 'cuotas' | 'pagos'

// ─── Sort types ──────────────────────────────────────────────────────────────
type SortDir = 'asc' | 'desc'

type InstSortField =
  | 'dueDate'
  | 'studentLastName'
  | 'courseName'
  | 'totalDue'
  | 'status'
type InstSort = { field: InstSortField; dir: SortDir } | null

type PaySortField =
  | 'paymentDate'
  | 'studentLastName'
  | 'courseName'
  | 'amount'
  | 'paymentMethod'
type PaySort = { field: PaySortField; dir: SortDir } | null

type StatusFilter = InstallmentStatus | 'TODAS'

type PanelState =
  | { kind: 'closed' }
  | { kind: 'create-payment'; preselectInstallmentId?: string }
  | { kind: 'detail-payment'; payment: Payment }

export default function Cuotas() {
  const [tab, setTab] = useState<Tab>('cuotas')

  // Search shared (lo aplicamos al tab activo)
  const [query,     setQuery]     = useState('')
  const [debounced, setDebounced] = useState('')

  // ── Cuotas state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODAS')
  const [instPage,     setInstPage]     = useState(0)
  const [instSort,     setInstSort]     = useState<InstSort>({ field: 'dueDate', dir: 'asc' })
  const [instData,     setInstData]     = useState<PageResponse<Installment> | null>(null)
  const [instLoading,  setInstLoading]  = useState(true)
  const [instError,    setInstError]    = useState<string | null>(null)

  // ── Pagos state
  const [payPage,    setPayPage]    = useState(0)
  const [paySort,    setPaySort]    = useState<PaySort>({ field: 'paymentDate', dir: 'desc' })
  const [payData,    setPayData]    = useState<PageResponse<Payment> | null>(null)
  const [payLoading, setPayLoading] = useState(true)
  const [payError,   setPayError]   = useState<string | null>(null)

  const [reload, setReload] = useState(0)
  const [panel,  setPanel]  = useState<PanelState>({ kind: 'closed' })

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setInstPage(0); setPayPage(0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Cuotas fetch
  useEffect(() => {
    setInstLoading(true); setInstError(null)
    installmentsApi.list({
      q:      debounced || undefined,
      status: statusFilter === 'TODAS' ? undefined : statusFilter,
      page:   instPage,
      size:   PAGE_SIZE,
      sort:   instSort ? `${instSort.field},${instSort.dir}` : undefined,
    })
      .then(res => { setInstData(res); setInstLoading(false) })
      .catch((err: Error) => { setInstError(err.message); setInstLoading(false) })
  }, [debounced, statusFilter, instPage, instSort, reload])

  // Pagos fetch
  useEffect(() => {
    setPayLoading(true); setPayError(null)
    paymentsApi.list({
      q:    debounced || undefined,
      page: payPage,
      size: PAGE_SIZE,
      sort: paySort ? `${paySort.field},${paySort.dir}` : undefined,
    })
      .then(res => { setPayData(res); setPayLoading(false) })
      .catch((err: Error) => { setPayError(err.message); setPayLoading(false) })
  }, [debounced, payPage, paySort, reload])

  function toggleInstSort(field: InstSortField) {
    setInstSort(prev => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc')             return { field, dir: 'desc' }
      return null
    })
    setInstPage(0)
  }

  function togglePaySort(field: PaySortField) {
    setPaySort(prev => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc')             return { field, dir: 'desc' }
      return null
    })
    setPayPage(0)
  }

  function handlePaymentSaved() {
    setPanel({ kind: 'closed' })
    setReload(r => r + 1)
  }

  async function handleWaiveSurcharge(inst: Installment) {
    if (!window.confirm(`¿Condonar el recargo de ${formatPrice(inst.surcharge)} en la cuota #${inst.number}?`)) return
    try {
      await installmentsApi.waiveSurcharge(inst.id)
      setReload(r => r + 1)
    } catch (err) {
      setInstError(err instanceof Error ? err.message : 'Error al condonar recargo')
    }
  }

  const statusOptions = useMemo<StatusFilter[]>(
    () => ['TODAS', ...INSTALLMENT_STATUSES],
    [],
  )

  const totalCuotas = instData?.totalElements ?? 0
  const totalPagos  = payData?.totalElements  ?? 0

  return (
    <div className="cuotas">
      <header className="cuotas__header">
        <div className="cuotas__header-text">
          <h2 className="cuotas__title">
            <span className="cuotas__title-icon"><CreditCard size={22} strokeWidth={2} /></span>
            Cuotas y Pagos
          </h2>
          <p className="cuotas__subtitle">
            {tab === 'cuotas'
              ? (totalCuotas > 0
                  ? `${totalCuotas} ${totalCuotas === 1 ? 'cuota' : 'cuotas'} en cartera`
                  : 'Cronograma de cuotas de las inscripciones activas')
              : (totalPagos > 0
                  ? `${totalPagos} ${totalPagos === 1 ? 'pago registrado' : 'pagos registrados'}`
                  : 'Historial de pagos recibidos')}
          </p>
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={() => setPanel({ kind: 'create-payment' })}
        >
          <Plus size={16} strokeWidth={2.2} /> Registrar pago
        </button>
      </header>

      {/* Tabs */}
      <div className="cuotas__tabs" role="tablist">
        <button
          type="button"
          className={`cuotas__tab ${tab === 'cuotas' ? 'cuotas__tab--active' : ''}`}
          onClick={() => setTab('cuotas')}
          role="tab"
          aria-selected={tab === 'cuotas'}
        >
          <CreditCard size={15} /> Cuotas
        </button>
        <button
          type="button"
          className={`cuotas__tab ${tab === 'pagos' ? 'cuotas__tab--active' : ''}`}
          onClick={() => setTab('pagos')}
          role="tab"
          aria-selected={tab === 'pagos'}
        >
          <Receipt size={15} /> Pagos
        </button>
      </div>

      <div className="cuotas__toolbar">
        <div className="search">
          <Search size={16} strokeWidth={1.8} className="search__icon" />
          <input
            type="text"
            placeholder={tab === 'cuotas'
              ? 'Buscar por alumno o curso…'
              : 'Buscar por alumno, curso o n° recibo…'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search__input"
          />
        </div>

        {tab === 'cuotas' && (
          <div className="cuotas__chips" role="tablist" aria-label="Estado">
            {statusOptions.map(opt => (
              <button
                key={opt}
                type="button"
                className={`chip ${statusFilter === opt ? 'chip--active' : ''}`}
                onClick={() => { setStatusFilter(opt); setInstPage(0) }}
                role="tab"
                aria-selected={statusFilter === opt}
              >
                {opt === 'TODAS' ? 'Todas' : INSTALLMENT_STATUS_LABELS[opt]}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'cuotas' ? (
        <CuotasTab
          data={instData}
          loading={instLoading}
          error={instError}
          sort={instSort}
          onToggleSort={toggleInstSort}
          query={debounced}
          page={instPage}
          onPage={setInstPage}
          onPay={(inst) => setPanel({ kind: 'create-payment', preselectInstallmentId: inst.id })}
          onWaive={handleWaiveSurcharge}
        />
      ) : (
        <PagosTab
          data={payData}
          loading={payLoading}
          error={payError}
          sort={paySort}
          onToggleSort={togglePaySort}
          query={debounced}
          page={payPage}
          onPage={setPayPage}
          onView={(p) => setPanel({ kind: 'detail-payment', payment: p })}
        />
      )}

      {panel.kind === 'create-payment' && (
        <PaymentForm
          preselectInstallmentId={panel.preselectInstallmentId}
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handlePaymentSaved}
          onSubmit={(payload: PaymentCreateRequest) => paymentsApi.create(payload)}
        />
      )}
      {panel.kind === 'detail-payment' && (
        <PaymentDetail
          payment={panel.payment}
          onClose={() => setPanel({ kind: 'closed' })}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cuotas tab
// ═══════════════════════════════════════════════════════════════════════════════
function CuotasTab(props: {
  data:    PageResponse<Installment> | null
  loading: boolean
  error:   string | null
  sort:    InstSort
  onToggleSort: (f: InstSortField) => void
  query:   string
  page:    number
  onPage:  (n: number) => void
  onPay:   (i: Installment) => void
  onWaive: (i: Installment) => void
}) {
  const { data, loading, error, sort, onToggleSort, query, page, onPage, onPay, onWaive } = props
  const items = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <>
      <div className="cuotas__table-wrap">
        {loading && <div className="cuotas__loading">Cargando…</div>}

        {!loading && error && (
          <EmptyState
            icon={CreditCard}
            message="No se pudieron cargar las cuotas"
            hint={error}
          />
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            icon={CreditCard}
            message="Sin resultados"
            hint={query ? `No hay cuotas para "${query}"` : 'No hay cuotas cargadas.'}
          />
        )}

        {!loading && !error && items.length > 0 && (
          <table className="cuotas-table">
            <thead>
              <tr>
                <SortTh
                  label="Alumno"
                  active={sort?.field === 'studentLastName'}
                  dir={sort?.field === 'studentLastName' ? sort.dir : null}
                  onClick={() => onToggleSort('studentLastName')}
                />
                <SortTh
                  label="Curso"
                  active={sort?.field === 'courseName'}
                  dir={sort?.field === 'courseName' ? sort.dir : null}
                  onClick={() => onToggleSort('courseName')}
                />
                <th className="col-cuota">Cuota</th>
                <SortTh
                  label="Vencimiento"
                  active={sort?.field === 'dueDate'}
                  dir={sort?.field === 'dueDate' ? sort.dir : null}
                  onClick={() => onToggleSort('dueDate')}
                  className="col-vencimiento"
                />
                <SortTh
                  label="Total"
                  active={sort?.field === 'totalDue'}
                  dir={sort?.field === 'totalDue' ? sort.dir : null}
                  onClick={() => onToggleSort('totalDue')}
                  className="col-precio"
                />
                <SortTh
                  label="Estado"
                  active={sort?.field === 'status'}
                  dir={sort?.field === 'status' ? sort.dir : null}
                  onClick={() => onToggleSort('status')}
                  className="col-estado"
                />
                <th className="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id} className="cuotas-table__row">
                  <td>
                    <div className="cuotas-cell">
                      <div className="cuotas-cell__avatar">
                        <UserCircle2 size={26} strokeWidth={1.4} />
                      </div>
                      <div>
                        <div className="cuotas-cell__name">
                          {i.enrollment.studentLastName}, {i.enrollment.studentFirstName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="cuotas-course">
                      <GraduationCap size={16} strokeWidth={1.6} />
                      <div>
                        <div className="cuotas-course__name">{i.enrollment.courseName}</div>
                        {i.enrollment.courseCode && (
                          <div className="cuotas-course__code">{i.enrollment.courseCode}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="td-num col-cuota">
                    <span className="cell-inline">
                      <Hash size={12} strokeWidth={1.8} /> {i.number}
                    </span>
                  </td>
                  <td className="td-date col-vencimiento">
                    <span className="cell-inline">
                      <Calendar size={13} strokeWidth={1.8} /> {formatDate(i.dueDate)}
                    </span>
                  </td>
                  <td className="col-precio">
                    <div className="cuotas-amount">
                      <span className="price">
                        <CircleDollarSign size={13} strokeWidth={1.8} />
                        {formatPrice(i.totalDue)}
                      </span>
                      {i.surcharge > 0 && (
                        <span className="cuotas-amount__surcharge" title="Recargo del 5%">
                          +{formatPrice(i.surcharge)} recargo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="col-estado">
                    <span className={`badge ${statusBadgeClass(i.status)}`}>
                      {INSTALLMENT_STATUS_LABELS[i.status]}
                    </span>
                    {i.moodleSuspended && (
                      <span className="badge badge--moodle" title="Acceso a Moodle suspendido">
                        Moodle off
                      </span>
                    )}
                  </td>
                  <td className="col-acciones">
                    <div className="row-actions">
                      {i.surcharge > 0 && i.status !== 'PAID' && (
                        <button
                          className="row-actions__btn"
                          type="button"
                          onClick={() => onWaive(i)}
                          aria-label="Condonar recargo"
                          title="Condonar recargo (admin)"
                        >
                          <BadgeCheck size={16} />
                        </button>
                      )}
                      {i.status !== 'PAID' && (
                        <button
                          className="row-actions__btn row-actions__btn--primary"
                          type="button"
                          onClick={() => onPay(i)}
                          aria-label="Registrar pago"
                          title="Registrar pago de esta cuota"
                        >
                          <CreditCard size={16} />
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
          onChange={onPage}
        />
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pagos tab
// ═══════════════════════════════════════════════════════════════════════════════
function PagosTab(props: {
  data:    PageResponse<Payment> | null
  loading: boolean
  error:   string | null
  sort:    PaySort
  onToggleSort: (f: PaySortField) => void
  query:   string
  page:    number
  onPage:  (n: number) => void
  onView:  (p: Payment) => void
}) {
  const { data, loading, error, sort, onToggleSort, query, page, onPage, onView } = props
  const items = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <>
      <div className="cuotas__table-wrap">
        {loading && <div className="cuotas__loading">Cargando…</div>}

        {!loading && error && (
          <EmptyState icon={Receipt} message="No se pudieron cargar los pagos" hint={error} />
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            icon={Receipt}
            message="Sin resultados"
            hint={query ? `No hay pagos para "${query}"` : 'No hay pagos registrados.'}
          />
        )}

        {!loading && !error && items.length > 0 && (
          <table className="cuotas-table">
            <thead>
              <tr>
                <SortTh
                  label="Recibo"
                  active={sort?.field === 'paymentMethod'}
                  dir={sort?.field === 'paymentMethod' ? sort.dir : null}
                  onClick={() => onToggleSort('paymentMethod')}
                />
                <SortTh
                  label="Alumno"
                  active={sort?.field === 'studentLastName'}
                  dir={sort?.field === 'studentLastName' ? sort.dir : null}
                  onClick={() => onToggleSort('studentLastName')}
                />
                <SortTh
                  label="Curso"
                  active={sort?.field === 'courseName'}
                  dir={sort?.field === 'courseName' ? sort.dir : null}
                  onClick={() => onToggleSort('courseName')}
                />
                <SortTh
                  label="Fecha"
                  active={sort?.field === 'paymentDate'}
                  dir={sort?.field === 'paymentDate' ? sort.dir : null}
                  onClick={() => onToggleSort('paymentDate')}
                  className="col-vencimiento"
                />
                <SortTh
                  label="Monto"
                  active={sort?.field === 'amount'}
                  dir={sort?.field === 'amount' ? sort.dir : null}
                  onClick={() => onToggleSort('amount')}
                  className="col-precio"
                />
                <th className="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id} className="cuotas-table__row">
                  <td>
                    <div className="cuotas-receipt">
                      <Receipt size={14} strokeWidth={1.6} />
                      <div>
                        <div className="cuotas-receipt__num">{p.receiptNumber}</div>
                        <div className="cuotas-receipt__method">
                          {PAYMENT_METHOD_LABELS[p.paymentMethod]}
                          {p.installmentNumber != null && ` · cuota #${p.installmentNumber}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="cuotas-cell">
                      <div className="cuotas-cell__avatar">
                        <UserCircle2 size={26} strokeWidth={1.4} />
                      </div>
                      <div>
                        <div className="cuotas-cell__name">
                          {p.enrollment.studentLastName}, {p.enrollment.studentFirstName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="cuotas-course">
                      <GraduationCap size={16} strokeWidth={1.6} />
                      <div className="cuotas-course__name">{p.enrollment.courseName}</div>
                    </div>
                  </td>
                  <td className="td-date col-vencimiento">
                    <span className="cell-inline">
                      <Calendar size={13} strokeWidth={1.8} /> {formatDate(p.paymentDate)}
                    </span>
                  </td>
                  <td className="col-precio">
                    <span className="price">
                      <CircleDollarSign size={13} strokeWidth={1.8} />
                      {formatPrice(p.amount)}
                    </span>
                  </td>
                  <td className="col-acciones">
                    <div className="row-actions">
                      <button
                        className="row-actions__btn"
                        type="button"
                        onClick={() => onView(p)}
                        aria-label="Ver recibo"
                        title="Ver recibo"
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
          onChange={onPage}
        />
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers / sub-componentes
// ═══════════════════════════════════════════════════════════════════════════════
function SortTh(props: {
  label:   string
  active:  boolean
  dir:     SortDir | null
  onClick: () => void
  className?: string
}) {
  return (
    <th
      onClick={props.onClick}
      className={`th-sortable ${props.active ? 'th-sortable--active' : ''} ${props.className ?? ''}`}
    >
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

function statusBadgeClass(s: InstallmentStatus): string {
  switch (s) {
    case 'PAID':      return 'badge--activo'
    case 'PENDING':   return 'badge--pendiente'
    case 'OVERDUE':   return 'badge--inactivo'
    case 'SUSPENDED': return 'badge--suspendida'
  }
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1)
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

