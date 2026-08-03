import { useEffect, useMemo, useState } from 'react'
import {
  Plus, FileSpreadsheet, GraduationCap, ArrowUp, ArrowDown, ArrowUpDown,
  Calendar, CircleDollarSign, Users,
  Eye, RefreshCw, BadgeCheck, Download,
} from 'lucide-react'
import { diplomasApi } from '../api/diplomas'
import { diplomaSettlementsApi } from '../api/diploma-settlements'
import type { Diploma } from '../types/diploma'
import type { DiplomaSettlement, SettlementStatus } from '../types/diploma-settlement'
import { SETTLEMENT_STATUS_LABELS } from '../types/diploma-settlement'
import EmptyState from '../components/EmptyState'
import SettlementForm from '../components/SettlementForm'
import NewSettlementDialog from '../components/NewSettlementDialog'
import SettlementDetail from '../components/SettlementDetail'
import SalesCommissionPanel from '../components/SalesCommissionPanel'
import TeachingSettlementPanel from '../components/TeachingSettlementPanel'
import { confirmAction, alertError, toastSuccess } from '../lib/confirm'
import { canWrite } from '../lib/access'
import { exportToCsv, dateStamp } from '../lib/exportCsv'
import './Liquidaciones.scss'

type SortDir   = 'asc' | 'desc'
type SortField = 'period' | 'totalCollected' | 'partnersTotal' | 'status'
type SortState = { field: SortField; dir: SortDir } | null

type StatusFilter = SettlementStatus | 'TODAS'

type PanelState =
  | { kind: 'closed' }
  | { kind: 'choose' }
  | { kind: 'create'; diploma: Diploma }
  | { kind: 'detail'; settlement: DiplomaSettlement }

const MONTHS = [
  'enero', 'febrero', 'marzo',     'abril',
  'mayo',  'junio',   'julio',     'agosto',
  'septiembre','octubre','noviembre','diciembre',
]

/**
 * Tipos de liquidación (pedido 2026-07-24, 24:48: "que sea liquidaciones general
 * y que uno elija liquidar la diplomatura PREMA, las horas docentes, las ventas y
 * comisiones"). Antes esta pantalla obligaba a elegir una diplomatura primero.
 *
 * Las tres están operativas: la fórmula de horas docentes se cerró el 2026-07-30
 * con la planilla completa y las respuestas de Nico (doc 17 §3.2).
 */
type SettlementKind = 'DIPLOMATURA' | 'COMISIONES' | 'HORAS'

const KINDS: { key: SettlementKind; label: string; disabled?: boolean; hint?: string }[] = [
  { key: 'DIPLOMATURA', label: 'Diplomatura (PREMA)' },
  { key: 'COMISIONES',  label: 'Comisiones de vendedora' },
  { key: 'HORAS', label: 'Horas docentes' },
]

export default function Liquidaciones() {
  const [kind, setKind] = useState<SettlementKind>('DIPLOMATURA')
  const [diplomas,         setDiplomas]         = useState<Diploma[] | null>(null)
  const [selectedDiplomaId, setSelectedDiplomaId] = useState<string>('')
  const [statusFilter,     setStatusFilter]     = useState<StatusFilter>('TODAS')
  const [sort,             setSort]             = useState<SortState>({ field: 'period', dir: 'desc' })

  const [items,    setItems]    = useState<DiplomaSettlement[] | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [reload,   setReload]   = useState(0)

  const [panel, setPanel] = useState<PanelState>({ kind: 'closed' })

  // Cargar diplomaturas activas para el selector
  useEffect(() => {
    diplomasApi.list({ onlyActive: true })
      .then(setDiplomas)
      .catch(() => setDiplomas([]))
  }, [])

  // Cargar settlements cuando hay diploma seleccionado
  useEffect(() => {
    if (!selectedDiplomaId) { setItems(null); return }
    setLoading(true); setError(null)
    diplomaSettlementsApi.listByDiploma(selectedDiplomaId)
      .then(res => { setItems(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [selectedDiplomaId, reload])

  const selectedDiploma = useMemo(
    () => diplomas?.find(d => d.id === selectedDiplomaId) ?? null,
    [diplomas, selectedDiplomaId],
  )

  const visible = useMemo(() => {
    if (!items) return []
    let list = items
    if (statusFilter !== 'TODAS') list = list.filter(s => s.status === statusFilter)
    if (sort) {
      const { field, dir } = sort
      const mult = dir === 'desc' ? -1 : 1
      list = [...list].sort((a, b) => compare(a, b, field) * mult)
    }
    return list
  }, [items, statusFilter, sort])

  function toggleSort(field: SortField) {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc')             return { field, dir: 'desc' }
      return null
    })
  }

  function handleSaved() {
    setPanel({ kind: 'closed' })
    setReload(r => r + 1)
  }

  function handleExport() {
    if (!visible.length || !selectedDiploma) return
    const slug = selectedDiploma.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)
    exportToCsv(`liquidaciones-${slug}-${dateStamp()}`, visible, [
      { label: 'Período',          value: s => `${MONTHS[s.periodMonth - 1]} ${s.periodYear}` },
      { label: 'Total cobrado',    value: s => s.totalCollected ?? '' },
      { label: 'Impuestos',          value: s => s.taxCommissionAmount ?? '' },
      { label: 'Subtotal 1',         value: s => s.subtotal1 ?? '' },
      { label: 'Secretaría',         value: s => s.secretaryAmount ?? '' },
      { label: 'Publicidad',         value: s => s.advertisingAmount ?? '' },
      { label: 'Administración',     value: s => s.administrationAmount ?? '' },
      { label: 'Gastos varios',      value: s => s.miscExpensesAmount ?? '' },
      { label: 'Subtotal 2',         value: s => s.subtotal2 ?? '' },
      { label: 'Mitad',              value: s => s.halfAmount ?? '' },
      { label: 'Grabaciones',        value: s => s.recordingsAmount ?? '' },
      { label: 'Directoras (total)', value: s => s.directorsBaseAmount ?? '' },
      { label: 'IMEDBA',             value: s => s.imedbaAmount ?? '' },
      { label: 'UNTREF acumulado',   value: s => s.untrefAmount ?? '' },
      { label: 'Estado',             value: s => SETTLEMENT_STATUS_LABELS[s.status] },
    ])
  }

  async function handleAction(s: DiplomaSettlement, action: 'recompute' | 'approve' | 'mark-paid') {
    const meta = {
      'recompute': { verb: 'recomputar el reparto de',  done: 'Reparto recomputado',  icon: 'question' as const, danger: false },
      'approve':   { verb: 'aprobar',                    done: 'Liquidación aprobada', icon: 'warning'  as const, danger: false },
      'mark-paid': { verb: 'marcar como pagada',         done: 'Liquidación pagada — egresos asentados en Presupuesto', icon: 'warning' as const, danger: false },
    }[action]
    const period = `${MONTHS[s.periodMonth - 1]} ${s.periodYear}`
    const ok = await confirmAction({
      title: `¿${meta.verb.charAt(0).toUpperCase()}${meta.verb.slice(1)} la liquidación?`,
      text:  `Período ${period}. Esta acción ${action === 'recompute' ? 'recalcula el reparto' : 'no se puede deshacer'}.`,
      icon:  meta.icon,
      confirmText: 'Sí, continuar',
    })
    if (!ok) return
    try {
      let updated: DiplomaSettlement
      if (action === 'recompute')      updated = await diplomaSettlementsApi.recompute(s.id)
      else if (action === 'approve')   updated = await diplomaSettlementsApi.approve(s.id)
      else                             updated = await diplomaSettlementsApi.markPaid(s.id)
      setReload(r => r + 1)
      // Si el panel detail estaba abierto sobre este settlement, refrescarlo
      if (panel.kind === 'detail' && panel.settlement.id === s.id) {
        setPanel({ kind: 'detail', settlement: updated })
      }
      toastSuccess(meta.done)
    } catch (err) {
      alertError('No se pudo completar la operación', err instanceof Error ? err.message : undefined)
    }
  }

  const total = items?.length ?? 0

  return (
    <div className="liquidaciones">
      <header className="liquidaciones__header">
        <div className="liquidaciones__header-text">
          <h2 className="liquidaciones__title">
            <span className="liquidaciones__title-icon"><FileSpreadsheet size={22} strokeWidth={2} /></span>
            Liquidaciones
          </h2>
          <p className="liquidaciones__subtitle">
            {kind === 'COMISIONES'
              ? 'Comisión de la vendedora sobre lo cobrado en el mes — cursos y libros'
              : kind === 'HORAS'
                ? 'Docentes y preceptoras, según las clases cargadas en el mes'
                : selectedDiploma
                  ? (total > 0
                      ? `${total} ${total === 1 ? 'liquidación' : 'liquidaciones'} de ${selectedDiploma.name}`
                      : `Sin liquidaciones para ${selectedDiploma.name}`)
                  : 'Reparto mensual entre directoras, universidad e IMEDBA'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {kind === 'DIPLOMATURA' && (
            <button className="btn-ghost" type="button" onClick={handleExport}
              disabled={!visible.length || !selectedDiploma}>
              <Download size={16} strokeWidth={2} /> Exportar
            </button>
          )}
          {canWrite('/liquidaciones') && (
            // Un solo punto de entrada para las tres. El tipo se elige DENTRO del
            // diálogo y el formulario cambia — ya no hace falta preseleccionar
            // una diplomatura en la pantalla (llamada 2026-07-24, 24:38).
            <button className="btn-primary" type="button" onClick={() => setPanel({ kind: 'choose' })}>
              <Plus size={16} strokeWidth={2.2} /> Nueva liquidación
            </button>
          )}
        </div>
      </header>

      <div className="liquidaciones__kinds" role="tablist" aria-label="Tipo de liquidación">
        {KINDS.map(k => (
          <button
            key={k.key}
            type="button"
            role="tab"
            aria-selected={kind === k.key}
            className={`kind-tab ${kind === k.key ? 'kind-tab--active' : ''}`}
            onClick={() => !k.disabled && setKind(k.key)}
            disabled={k.disabled}
            title={k.hint}
          >
            {k.label}
            {k.disabled && <span className="kind-tab__soon">pendiente</span>}
          </button>
        ))}
      </div>

      {kind === 'COMISIONES' && <SalesCommissionPanel />}
      {kind === 'HORAS'      && <TeachingSettlementPanel />}

      {kind === 'DIPLOMATURA' && (
      <div className="liquidaciones__toolbar">
        <div className="diploma-select">
          <label className="diploma-select__label">
            <GraduationCap size={15} strokeWidth={1.8} /> Diplomatura
          </label>
          <select
            className="diploma-select__input"
            value={selectedDiplomaId}
            onChange={e => setSelectedDiplomaId(e.target.value)}
          >
            <option value="">— Seleccionar diplomatura —</option>
            {diplomas?.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {selectedDiplomaId && (
          <div className="liquidaciones__chips" role="tablist" aria-label="Estado">
            {(['TODAS', 'DRAFT', 'APPROVED', 'PAID'] as StatusFilter[]).map(opt => (
              <button
                key={opt}
                type="button"
                className={`chip ${statusFilter === opt ? 'chip--active' : ''}`}
                onClick={() => setStatusFilter(opt)}
                role="tab"
                aria-selected={statusFilter === opt}
              >
                {opt === 'TODAS' ? 'Todas' : SETTLEMENT_STATUS_LABELS[opt]}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {kind === 'DIPLOMATURA' && (
      <div className="liquidaciones__table-wrap">
        {!selectedDiplomaId && (
          <EmptyState
            icon={GraduationCap}
            message="Seleccioná una diplomatura"
            hint="Elegí una diplomatura del selector para ver sus liquidaciones mensuales."
          />
        )}

        {selectedDiplomaId && loading && (
          <div className="liquidaciones__loading">Cargando…</div>
        )}

        {selectedDiplomaId && !loading && error && (
          <EmptyState
            icon={FileSpreadsheet}
            message="No se pudieron cargar las liquidaciones"
            hint={error}
          />
        )}

        {selectedDiplomaId && !loading && !error && visible.length === 0 && (
          <EmptyState
            icon={FileSpreadsheet}
            message="Sin liquidaciones"
            hint="Generá una nueva liquidación con el botón de arriba."
          />
        )}

        {selectedDiplomaId && !loading && !error && visible.length > 0 && (
          <table className="liquidaciones-table">
            <thead>
              <tr>
                <SortableTh
                  label="Período"
                  field="period"
                  sort={sort}
                  onClick={() => toggleSort('period')}
                  className="col-periodo"
                />
                <SortableTh
                  label="Total cobrado"
                  field="totalCollected"
                  sort={sort}
                  onClick={() => toggleSort('totalCollected')}
                  className="col-precio"
                />
                <SortableTh
                  label="Directoras"
                  field="partnersTotal"
                  sort={sort}
                  onClick={() => toggleSort('partnersTotal')}
                  className="col-precio"
                />
                <SortableTh
                  label="Estado"
                  field="status"
                  sort={sort}
                  onClick={() => toggleSort('status')}
                  className="col-estado"
                />
                <th className="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(s => (
                <tr key={s.id} className="liquidaciones-table__row">
                  <td className="col-periodo">
                    <span className="cell-inline">
                      <Calendar size={13} strokeWidth={1.8} />
                      <span className="periodo">{MONTHS[s.periodMonth - 1]} {s.periodYear}</span>
                    </span>
                  </td>
                  <td className="col-precio">
                    <span className="price"><CircleDollarSign size={13} strokeWidth={1.8} />{formatPrice(s.totalCollected)}</span>
                  </td>
                  <td className="col-precio">
                    <span className="cell-inline">
                      <Users size={13} strokeWidth={1.8} />
                      <span className="price">{formatPrice(s.directorsBaseAmount)}</span>
                      <span className="muted">·{s.directorsDistribution.length}</span>
                    </span>
                  </td>
                  <td className="col-estado">
                    <span className={`badge ${statusBadgeClass(s.status)}`}>
                      {SETTLEMENT_STATUS_LABELS[s.status]}
                    </span>
                  </td>
                  <td className="col-acciones">
                    <div className="row-actions">
                      <button
                        className="row-actions__btn"
                        type="button"
                        onClick={() => setPanel({ kind: 'detail', settlement: s })}
                        aria-label="Ver detalle"
                        title="Ver detalle"
                      >
                        <Eye size={16} />
                      </button>
                      {s.status === 'DRAFT' && canWrite('/liquidaciones') && (
                        <>
                          <button
                            className="row-actions__btn"
                            type="button"
                            onClick={() => handleAction(s, 'recompute')}
                            aria-label="Recomputar"
                            title="Recomputar reparto"
                          >
                            <RefreshCw size={16} />
                          </button>
                          <button
                            className="row-actions__btn row-actions__btn--primary"
                            type="button"
                            onClick={() => handleAction(s, 'approve')}
                            aria-label="Aprobar"
                            title="Aprobar liquidación"
                          >
                            <BadgeCheck size={16} />
                          </button>
                        </>
                      )}
                      {s.status === 'APPROVED' && canWrite('/liquidaciones') && (
                        <button
                          className="row-actions__btn row-actions__btn--primary"
                          type="button"
                          onClick={() => handleAction(s, 'mark-paid')}
                          aria-label="Marcar pagada"
                          title="Marcar como pagada"
                        >
                          <CircleDollarSign size={16} />
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
      )}

      {panel.kind === 'choose' && (
        <NewSettlementDialog
          diplomas={diplomas}
          onClose={() => setPanel({ kind: 'closed' })}
          onPickDiploma={d => {
            // Al elegir la diplomatura acá también se sincroniza el listado de
            // abajo, así el resultado queda a la vista al guardar.
            setSelectedDiplomaId(d.id)
            setKind('DIPLOMATURA')
            setPanel({ kind: 'create', diploma: d })
          }}
          onCreated={k => {
            setKind(k === 'HORAS' ? 'HORAS' : 'COMISIONES')
            setPanel({ kind: 'closed' })
            setReload(r => r + 1)
          }}
        />
      )}
      {panel.kind === 'create' && (
        <SettlementForm
          diploma={panel.diploma}
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handleSaved}
          onSubmit={(payload) => diplomaSettlementsApi.create(payload)}
        />
      )}
      {panel.kind === 'detail' && (
        <SettlementDetail
          settlement={panel.settlement}
          onClose={() => setPanel({ kind: 'closed' })}
          onRecompute={(s) => handleAction(s, 'recompute')}
          onApprove={(s)   => handleAction(s, 'approve')}
          onMarkPaid={(s)  => handleAction(s, 'mark-paid')}
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

function compare(a: DiplomaSettlement, b: DiplomaSettlement, field: SortField): number {
  switch (field) {
    case 'period':         return (a.periodYear - b.periodYear) || (a.periodMonth - b.periodMonth)
    case 'totalCollected': return a.totalCollected - b.totalCollected
    case 'partnersTotal':  return a.directorsBaseAmount - b.directorsBaseAmount
    case 'status':         return a.status.localeCompare(b.status)
  }
}

function statusBadgeClass(s: SettlementStatus): string {
  switch (s) {
    case 'DRAFT':    return 'badge--pendiente'
    case 'APPROVED': return 'badge--suspendida'
    case 'PAID':     return 'badge--activo'
  }
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)
}
