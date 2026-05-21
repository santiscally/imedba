import { useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, ChevronLeft, ChevronRight,
  CreditCard, Receipt, ArrowUp, ArrowDown, ArrowUpDown,
  UserCircle2, GraduationCap, CircleDollarSign,
  Eye, Hash, Calendar, BadgeCheck, X, Undo2, History, FilterX,
} from 'lucide-react'
import { confirmAction, alertError, toastSuccess } from '../lib/confirm'
import { installmentsApi } from '../api/installments'
import { paymentsApi } from '../api/payments'
import { enrollmentsApi } from '../api/enrollments'
import type { PageResponse } from '../types/common'
import type { Installment, InstallmentStatus } from '../types/installment'
import {
  INSTALLMENT_STATUSES, INSTALLMENT_STATUS_LABELS, installmentLabel, installmentKind,
} from '../types/installment'
import type { Payment, PaymentCreateRequest } from '../types/payment'
import type { Enrollment } from '../types/enrollment'
import { PAYMENT_METHOD_LABELS } from '../types/enrollment'
import EmptyState from '../components/EmptyState'
import PaymentForm from '../components/PaymentForm'
import PaymentDetail from '../components/PaymentDetail'
import './Cuotas.scss'

const PAGE_SIZE = 10

type Tab = 'cuotas' | 'pagos' | 'historico'

type SortDir = 'asc' | 'desc'

// Solo campos que el backend (Pageable) sabe ordenar — son los de la entidad.
type InstSortField = 'dueDate' | 'number' | 'totalDue' | 'status'
type InstSort = { field: InstSortField; dir: SortDir } | null

type PaySortField = 'paymentDate' | 'amount' | 'paymentMethod'
type PaySort = { field: PaySortField; dir: SortDir } | null

type StatusFilter = InstallmentStatus | 'TODAS'

type PanelState =
  | { kind: 'closed' }
  | { kind: 'create-payment'; preselectInstallmentId?: string }
  | { kind: 'create-payment-batch'; installments: Installment[] }
  | { kind: 'detail-payment'; payment: Payment }

// Datos del alumno/curso resueltos desde el enrollment.
interface EnrInfo { studentName: string; courseName: string; courseCode: string | null; courseId: string }

export default function Cuotas() {
  const [tab, setTab] = useState<Tab>('cuotas')

  const [query,     setQuery]     = useState('')
  const [debounced, setDebounced] = useState('')

  // ── Mapa de enrollments para resolver alumno/curso (el backend no los embebe)
  const [enrMap, setEnrMap] = useState<Map<string, EnrInfo>>(new Map())

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

  // ── Histórico de cuotas pagadas (status PAID)
  const [histPage,    setHistPage]    = useState(0)
  const [histData,    setHistData]    = useState<PageResponse<Installment> | null>(null)
  const [histLoading, setHistLoading] = useState(true)
  const [histError,   setHistError]   = useState<string | null>(null)

  // ── Filtros comunes (fecha desde/hasta + curso)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [courseId, setCourseId] = useState('')
  const filtersActive = !!(dateFrom || dateTo || courseId)
  function clearFilters() {
    setDateFrom(''); setDateTo(''); setCourseId('')
    setInstPage(0); setPayPage(0); setHistPage(0)
  }

  const [reload, setReload] = useState(0)
  const [panel,  setPanel]  = useState<PanelState>({ kind: 'closed' })

  // ── Selección múltiple de cuotas (para pagar varias juntas).
  //    Se guarda la cuota completa para no depender de la página actual, y se
  //    bloquea a una sola inscripción (regla de negocio: un pago por inscripción).
  const [selected, setSelected] = useState<Map<string, Installment>>(new Map())
  const selectedList    = useMemo(() => [...selected.values()], [selected])
  const selectedEnrId   = selectedList[0]?.enrollmentId ?? null
  const selectedTotal   = useMemo(
    () => selectedList.reduce((acc, i) => acc + i.totalDue, 0), [selectedList])

  function toggleSelect(inst: Installment) {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(inst.id)) next.delete(inst.id)
      else next.set(inst.id, inst)
      return next
    })
  }
  function clearSelection() { setSelected(new Map()) }

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query.trim()); setInstPage(0); setPayPage(0); setHistPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Al cambiar cualquier filtro, volver a la primera página de cada tab.
  useEffect(() => { setInstPage(0); setPayPage(0); setHistPage(0) }, [dateFrom, dateTo, courseId])

  // Cargar enrollments una vez para resolver nombres por id.
  useEffect(() => {
    enrollmentsApi.list({ size: 2000 })
      .then(res => {
        const m = new Map<string, EnrInfo>()
        for (const e of res.content) m.set(e.id, enrInfoOf(e))
        setEnrMap(m)
      })
      .catch(() => { /* si falla, las celdas muestran el id corto */ })
  }, [reload])

  // Cuotas fetch
  useEffect(() => {
    setInstLoading(true); setInstError(null)
    installmentsApi.list({
      q:        debounced || undefined,
      status:   statusFilter === 'TODAS' ? undefined : statusFilter,
      courseId: courseId || undefined,
      dueFrom:  dateFrom  || undefined,
      dueTo:    dateTo    || undefined,
      page:     instPage,
      size:     PAGE_SIZE,
      sort:     instSort ? `${instSort.field},${instSort.dir}` : undefined,
    })
      .then(res => { setInstData(res); setInstLoading(false) })
      .catch((err: Error) => { setInstError(err.message); setInstLoading(false) })
  }, [debounced, statusFilter, courseId, dateFrom, dateTo, instPage, instSort, reload])

  // Pagos fetch
  useEffect(() => {
    setPayLoading(true); setPayError(null)
    paymentsApi.list({
      q:        debounced || undefined,
      courseId: courseId || undefined,
      from:     dateFrom ? `${dateFrom}T00:00:00Z` : undefined,
      to:       dateTo   ? `${dateTo}T23:59:59Z`   : undefined,
      page:     payPage,
      size:     PAGE_SIZE,
      sort:     paySort ? `${paySort.field},${paySort.dir}` : undefined,
    })
      .then(res => { setPayData(res); setPayLoading(false) })
      .catch((err: Error) => { setPayError(err.message); setPayLoading(false) })
  }, [debounced, courseId, dateFrom, dateTo, payPage, paySort, reload])

  // Histórico fetch (cuotas pagadas)
  useEffect(() => {
    setHistLoading(true); setHistError(null)
    installmentsApi.list({
      q:        debounced || undefined,
      status:   'PAID',
      courseId: courseId || undefined,
      dueFrom:  dateFrom  || undefined,
      dueTo:    dateTo    || undefined,
      page:     histPage,
      size:     PAGE_SIZE,
      sort:     'dueDate,desc',
    })
      .then(res => { setHistData(res); setHistLoading(false) })
      .catch((err: Error) => { setHistError(err.message); setHistLoading(false) })
  }, [debounced, courseId, dateFrom, dateTo, histPage, reload])

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
    clearSelection()
    setReload(r => r + 1)
  }

  async function handleUndoPayment(p: Payment) {
    const enr = lookupEnr(p.enrollmentId)
    const ok = await confirmAction({
      title: '¿Deshacer este pago?',
      html: `Se eliminará el pago de <strong>${formatPrice(p.amount)}</strong>` +
        `${p.receiptNumber ? ` (recibo ${p.receiptNumber})` : ''} de <strong>${enr.studentName}</strong>.` +
        `${p.installmentId ? '<br>La cuota asociada volverá a quedar <strong>impaga</strong>.' : ''}` +
        '<br><br>Esta acción no se puede deshacer.',
      icon: 'warning',
      danger: true,
      confirmText: 'Sí, deshacer',
    })
    if (!ok) return
    try {
      await paymentsApi.remove(p.id)
      toastSuccess('Pago deshecho')
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudo deshacer el pago', err instanceof Error ? err.message : undefined)
    }
  }

  async function handleWaiveSurcharge(inst: Installment) {
    if (!window.confirm(`¿Condonar el recargo de ${formatPrice(inst.surchargeAmount)} en la cuota #${inst.number}?`)) return
    try {
      await installmentsApi.waiveSurcharge(inst.id)
      setReload(r => r + 1)
    } catch (err) {
      setInstError(err instanceof Error ? err.message : 'Error al condonar recargo')
    }
  }

  const lookupEnr = useMemo(() => (id: string): EnrInfo => (
    enrMap.get(id) ?? { studentName: `#${id.slice(0, 8)}`, courseName: '—', courseCode: null, courseId: '' }
  ), [enrMap])

  // Opciones del filtro por curso: cursos distintos presentes en los enrollments.
  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const e of enrMap.values()) {
      if (e.courseId && !seen.has(e.courseId)) seen.set(e.courseId, e.courseName)
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [enrMap])

  const statusOptions = useMemo<StatusFilter[]>(() => ['TODAS', ...INSTALLMENT_STATUSES], [])

  const totalCuotas = instData?.totalElements ?? 0
  const totalPagos  = payData?.totalElements  ?? 0
  const totalHist   = histData?.totalElements ?? 0

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
              : tab === 'pagos'
                ? (totalPagos > 0
                    ? `${totalPagos} ${totalPagos === 1 ? 'pago registrado' : 'pagos registrados'}`
                    : 'Historial de pagos recibidos')
                : (totalHist > 0
                    ? `${totalHist} ${totalHist === 1 ? 'cuota pagada' : 'cuotas pagadas'}`
                    : 'Histórico de cuotas saldadas')}
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
        <button
          type="button"
          className={`cuotas__tab ${tab === 'historico' ? 'cuotas__tab--active' : ''}`}
          onClick={() => setTab('historico')}
          role="tab"
          aria-selected={tab === 'historico'}
        >
          <History size={15} /> Histórico
        </button>
      </div>

      <div className="cuotas__toolbar">
        <div className="search">
          <Search size={16} strokeWidth={1.8} className="search__icon" />
          <input
            type="text"
            placeholder={tab === 'pagos'
              ? 'Buscar por alumno, curso o n° recibo…'
              : 'Buscar por alumno o curso…'}
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

        <div className="cuotas__filters">
          <div className="filter-field">
            <label>{tab === 'pagos' ? 'Pago desde' : 'Vence desde'}</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="filter-field">
            <label>{tab === 'pagos' ? 'Pago hasta' : 'Vence hasta'}</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="filter-field filter-field--grow">
            <label>Curso</label>
            <select value={courseId} onChange={e => setCourseId(e.target.value)}>
              <option value="">Todos los cursos</option>
              {courseOptions.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          {filtersActive && (
            <button type="button" className="filter-clear" onClick={clearFilters} title="Limpiar filtros">
              <FilterX size={15} /> Limpiar
            </button>
          )}
        </div>
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
          lookupEnr={lookupEnr}
          selected={selected}
          selectedEnrId={selectedEnrId}
          onToggleSelect={toggleSelect}
        />
      ) : tab === 'pagos' ? (
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
          onUndo={handleUndoPayment}
          lookupEnr={lookupEnr}
        />
      ) : (
        <HistoricoTab
          data={histData}
          loading={histLoading}
          error={histError}
          query={debounced}
          page={histPage}
          onPage={setHistPage}
          lookupEnr={lookupEnr}
        />
      )}

      {tab === 'cuotas' && selected.size > 0 && (
        <BulkBar
          count={selected.size}
          total={selectedTotal}
          who={selectedEnrId ? lookupEnr(selectedEnrId).studentName : ''}
          onPay={() => setPanel({ kind: 'create-payment-batch', installments: selectedList })}
          onClear={clearSelection}
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
      {panel.kind === 'create-payment-batch' && (
        <PaymentForm
          batchInstallments={panel.installments}
          batchWho={selectedEnrId ? lookupEnr(selectedEnrId) : undefined}
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handlePaymentSaved}
          onSubmit={(payload: PaymentCreateRequest) => paymentsApi.create(payload)}
        />
      )}
      {panel.kind === 'detail-payment' && (
        <PaymentDetail
          payment={panel.payment}
          enrInfo={lookupEnr(panel.payment.enrollmentId)}
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
  lookupEnr: (id: string) => EnrInfo
  selected:       Map<string, Installment>
  selectedEnrId:  string | null
  onToggleSelect: (i: Installment) => void
}) {
  const {
    data, loading, error, sort, onToggleSort, query, page, onPage, onPay, onWaive, lookupEnr,
    selected, selectedEnrId, onToggleSelect,
  } = props
  const items = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <>
      <div className="cuotas__table-wrap">
        {loading && <div className="cuotas__loading">Cargando…</div>}

        {!loading && error && (
          <EmptyState icon={CreditCard} message="No se pudieron cargar las cuotas" hint={error} />
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
                <th className="col-check" aria-label="Seleccionar" />
                <th>Alumno</th>
                <th>Curso</th>
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
              {items.map(i => {
                const enr = lookupEnr(i.enrollmentId)
                const isPayable = i.status !== 'PAID'
                const isSelected = selected.has(i.id)
                // Bloqueo a una sola inscripción: si ya hay selección de otra, deshabilitar.
                const lockedOut = selectedEnrId != null && selectedEnrId !== i.enrollmentId
                return (
                  <tr key={i.id} className={`cuotas-table__row ${isSelected ? 'cuotas-table__row--selected' : ''}`}>
                    <td className="col-check">
                      {isPayable && (
                        <input
                          type="checkbox"
                          className="cuotas-check"
                          checked={isSelected}
                          disabled={lockedOut}
                          onChange={() => onToggleSelect(i)}
                          aria-label={`Seleccionar ${installmentLabel(i.number)}`}
                          title={lockedOut
                            ? 'Solo se pueden pagar juntas cuotas de la misma inscripción'
                            : 'Seleccionar para pago múltiple'}
                        />
                      )}
                    </td>
                    <td>
                      <div className="cuotas-cell">
                        <div className="cuotas-cell__avatar">
                          <UserCircle2 size={26} strokeWidth={1.4} />
                        </div>
                        <div>
                          <div className="cuotas-cell__name">{enr.studentName}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cuotas-course">
                        <GraduationCap size={16} strokeWidth={1.6} />
                        <div>
                          <div className="cuotas-course__name">{enr.courseName}</div>
                          {enr.courseCode && (
                            <div className="cuotas-course__code">{enr.courseCode}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="td-num col-cuota">
                      {installmentKind(i.number) === 'MATRICULA' ? (
                        <span className="cuota-tag cuota-tag--matricula">Matrícula</span>
                      ) : (
                        <span className="cell-inline">
                          <Hash size={12} strokeWidth={1.8} /> {i.number}
                        </span>
                      )}
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
                        {i.surchargeAmount > 0 && (
                          <span className="cuotas-amount__surcharge" title="Recargo del 5%">
                            +{formatPrice(i.surchargeAmount)} recargo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="col-estado">
                      <span className={`badge ${statusBadgeClass(i.status)}`}>
                        {INSTALLMENT_STATUS_LABELS[i.status]}
                      </span>
                    </td>
                    <td className="col-acciones">
                      <div className="row-actions">
                        {i.surchargeAmount > 0 && i.status !== 'PAID' && (
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
                )
              })}
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
  onUndo:  (p: Payment) => void
  lookupEnr: (id: string) => EnrInfo
}) {
  const { data, loading, error, sort, onToggleSort, query, page, onPage, onView, onUndo, lookupEnr } = props
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
                <th>Recibo</th>
                <th>Alumno</th>
                <th>Curso</th>
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
              {items.map(p => {
                const enr = lookupEnr(p.enrollmentId)
                return (
                  <tr key={p.id} className="cuotas-table__row">
                    <td>
                      <div className="cuotas-receipt">
                        <Receipt size={14} strokeWidth={1.6} />
                        <div>
                          <div className="cuotas-receipt__num">{p.receiptNumber ?? '—'}</div>
                          <div className="cuotas-receipt__method">
                            {PAYMENT_METHOD_LABELS[p.paymentMethod]}
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
                          <div className="cuotas-cell__name">{enr.studentName}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cuotas-course">
                        <GraduationCap size={16} strokeWidth={1.6} />
                        <div className="cuotas-course__name">{enr.courseName}</div>
                      </div>
                    </td>
                    <td className="td-date col-vencimiento">
                      <span className="cell-inline">
                        <Calendar size={13} strokeWidth={1.8} /> {formatInstantDate(p.paymentDate)}
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
                        <button
                          className="row-actions__btn row-actions__btn--danger"
                          type="button"
                          onClick={() => onUndo(p)}
                          aria-label="Deshacer pago"
                          title="Deshacer pago"
                        >
                          <Undo2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
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
// Histórico de cuotas pagadas
// ═══════════════════════════════════════════════════════════════════════════════
function HistoricoTab(props: {
  data:    PageResponse<Installment> | null
  loading: boolean
  error:   string | null
  query:   string
  page:    number
  onPage:  (n: number) => void
  lookupEnr: (id: string) => EnrInfo
}) {
  const { data, loading, error, query, page, onPage, lookupEnr } = props
  const items = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <>
      <div className="cuotas__table-wrap">
        {loading && <div className="cuotas__loading">Cargando…</div>}

        {!loading && error && (
          <EmptyState icon={History} message="No se pudo cargar el histórico" hint={error} />
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            icon={History}
            message="Sin cuotas pagadas"
            hint={query ? `No hay cuotas pagadas para "${query}"` : 'Todavía no hay cuotas saldadas.'}
          />
        )}

        {!loading && !error && items.length > 0 && (
          <table className="cuotas-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Curso</th>
                <th className="col-cuota">Cuota</th>
                <th className="col-vencimiento">Vencimiento</th>
                <th className="col-vencimiento">Pagada el</th>
                <th className="col-precio">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => {
                const enr = lookupEnr(i.enrollmentId)
                return (
                  <tr key={i.id} className="cuotas-table__row">
                    <td>
                      <div className="cuotas-cell">
                        <div className="cuotas-cell__avatar">
                          <UserCircle2 size={26} strokeWidth={1.4} />
                        </div>
                        <div><div className="cuotas-cell__name">{enr.studentName}</div></div>
                      </div>
                    </td>
                    <td>
                      <div className="cuotas-course">
                        <GraduationCap size={16} strokeWidth={1.6} />
                        <div className="cuotas-course__name">{enr.courseName}</div>
                      </div>
                    </td>
                    <td className="td-num col-cuota">
                      {installmentKind(i.number) === 'MATRICULA' ? (
                        <span className="cuota-tag cuota-tag--matricula">Matrícula</span>
                      ) : (
                        <span className="cell-inline"><Hash size={12} strokeWidth={1.8} /> {i.number}</span>
                      )}
                    </td>
                    <td className="td-date col-vencimiento">
                      <span className="cell-inline">
                        <Calendar size={13} strokeWidth={1.8} /> {formatDate(i.dueDate)}
                      </span>
                    </td>
                    <td className="td-date col-vencimiento">
                      <span className="cell-inline">
                        <BadgeCheck size={13} strokeWidth={1.8} />
                        {i.paidAt ? formatInstantDate(i.paidAt) : '—'}
                      </span>
                    </td>
                    <td className="col-precio">
                      <span className="price">
                        <CircleDollarSign size={13} strokeWidth={1.8} />{formatPrice(i.totalDue)}
                      </span>
                    </td>
                  </tr>
                )
              })}
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
// Barra flotante de pago múltiple
// ═══════════════════════════════════════════════════════════════════════════════
function BulkBar(props: {
  count:   number
  total:   number
  who:     string
  onPay:   () => void
  onClear: () => void
}) {
  const { count, total, who, onPay, onClear } = props
  return (
    <div className="bulk-bar" role="region" aria-label="Pago múltiple">
      <div className="bulk-bar__info">
        <span className="bulk-bar__count">{count} {count === 1 ? 'cuota' : 'cuotas'}</span>
        {who && <span className="bulk-bar__who">{who}</span>}
        <span className="bulk-bar__total">
          <CircleDollarSign size={14} strokeWidth={1.8} /> {formatPrice(total)}
        </span>
      </div>
      <div className="bulk-bar__actions">
        <button type="button" className="btn-ghost" onClick={onClear}>
          <X size={15} /> Limpiar
        </button>
        <button type="button" className="btn-primary" onClick={onPay}>
          <CreditCard size={15} /> Registrar pago
        </button>
      </div>
    </div>
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

function enrInfoOf(e: Enrollment): EnrInfo {
  return {
    studentName: `${e.student.lastName}, ${e.student.firstName}`,
    courseName:  e.course.name,
    courseCode:  e.course.code,
    courseId:    e.course.id,
  }
}

function statusBadgeClass(s: InstallmentStatus): string {
  switch (s) {
    case 'PAID':    return 'badge--activo'
    case 'PENDING': return 'badge--pendiente'
    case 'OVERDUE': return 'badge--inactivo'
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

function formatInstantDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
