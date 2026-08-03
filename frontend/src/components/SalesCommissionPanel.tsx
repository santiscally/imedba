import { useEffect, useMemo, useState } from 'react'
import {
  Calculator, RefreshCw, BadgeCheck, CircleDollarSign, Save,
  Download, Info, User,
} from 'lucide-react'
import { salesCommissionsApi } from '../api/sales-commissions'
import type {
  CommissionSeller, SalesCommission, SalesCommissionSummary,
} from '../types/sales-commission'
import {
  COMMISSION_SOURCE_LABELS, SALES_COMMISSION_STATUS_LABELS, formatRate,
} from '../types/sales-commission'
import EmptyState from './EmptyState'
import { confirmAction, alertError, toastSuccess } from '../lib/confirm'
import { exportToCsv, dateStamp } from '../lib/exportCsv'
import { hasAuthority } from '../lib/auth'
import '../pages/SalesCommission.scss'

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/**
 * Liquidación de comisiones de vendedora (doc 17 §3.1).
 *
 * La fórmula está verificada contra la planilla real de junio-2026, así que la
 * tabla de buckets replica esas mismas filas a propósito: cursos al tramo bajo,
 * cursos al tramo alto, libros y ventas de meses anteriores. Que se lea igual que
 * el Excel de Nico es la forma de que pueda controlarlo de un vistazo.
 */
export default function SalesCommissionPanel() {
  const now = new Date()
  // Se liquida el mes cerrado, así que el default es el mes anterior al actual.
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [year,  setYear]  = useState(prev.getFullYear())
  const [month, setMonth] = useState(prev.getMonth() + 1)

  const [sellers,  setSellers]  = useState<CommissionSeller[] | null>(null)
  const [sellerId, setSellerId] = useState('')

  const [preview, setPreview] = useState<SalesCommission | null>(null)
  const [existing, setExisting] = useState<SalesCommissionSummary[]>([])

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [reload,  setReload]  = useState(0)

  const canWrite = hasAuthority('sales_commissions:write')

  // Vendedores con actividad en el período
  useEffect(() => {
    setSellers(null); setSellerId(''); setPreview(null)
    salesCommissionsApi.sellers(year, month)
      .then(s => {
        setSellers(s)
        if (s.length === 1) setSellerId(s[0].id)   // caso real de IMEDBA: una sola vendedora
      })
      .catch(() => setSellers([]))
  }, [year, month])

  // Preview + liquidaciones ya cargadas de esa vendedora
  useEffect(() => {
    if (!sellerId) { setPreview(null); setExisting([]); return }
    setLoading(true); setError(null)
    Promise.all([
      salesCommissionsApi.preview({ sellerUserId: sellerId, year, month }),
      salesCommissionsApi.listBySeller(sellerId),
    ])
      .then(([p, list]) => { setPreview(p); setExisting(list); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [sellerId, year, month, reload])

  const alreadySettled = useMemo(
    () => existing.find(s => s.periodYear === year && s.periodMonth === month) ?? null,
    [existing, year, month],
  )

  const sellerName = useMemo(
    () => sellers?.find(s => s.id === sellerId)?.name ?? null,
    [sellers, sellerId],
  )

  async function handleCreate() {
    if (!preview || !sellerId) return
    const ok = await confirmAction({
      title: '¿Generar la liquidación?',
      text: `${MONTHS[month - 1]} ${year} — ${formatPrice(preview.totalCommission)}. `
          + 'Queda como borrador; podés recalcularla antes de aprobarla.',
      icon: 'question',
      confirmText: 'Sí, generar',
    })
    if (!ok) return
    setSaving(true)
    try {
      await salesCommissionsApi.create({
        sellerUserId: sellerId,
        sellerName,
        periodMonth:  month,
        periodYear:   year,
      })
      toastSuccess('Liquidación generada')
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudo generar', err instanceof Error ? err.message : undefined)
    } finally { setSaving(false) }
  }

  async function handleAction(id: string, action: 'recompute' | 'approve' | 'mark-paid') {
    const meta = {
      'recompute': { title: '¿Recalcular?',      done: 'Recalculada' },
      'approve':   { title: '¿Aprobar?',          done: 'Aprobada' },
      'mark-paid': { title: '¿Marcar como pagada?', done: 'Marcada como pagada' },
    }[action]
    const ok = await confirmAction({
      title: meta.title,
      text: action === 'recompute'
        ? 'Vuelve a leer los cobros del período y regenera el detalle.'
        : 'Esta acción no se puede deshacer.',
      icon: action === 'recompute' ? 'question' : 'warning',
      confirmText: 'Sí, continuar',
    })
    if (!ok) return
    try {
      if (action === 'recompute')    await salesCommissionsApi.recompute(id)
      else if (action === 'approve') await salesCommissionsApi.approve(id)
      else                            await salesCommissionsApi.markPaid(id)
      toastSuccess(meta.done)
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudo completar', err instanceof Error ? err.message : undefined)
    }
  }

  function handleExport() {
    if (!preview?.lines.length) return
    exportToCsv(`comisiones-${year}-${String(month).padStart(2, '0')}-${dateStamp()}`,
      preview.lines, [
        { label: 'Fecha venta', value: l => l.saleDate },
        { label: 'Tipo',        value: l => COMMISSION_SOURCE_LABELS[l.sourceType] },
        { label: 'Alumno',      value: l => l.studentName ?? '' },
        { label: 'Producto',    value: l => l.productName ?? '' },
        { label: 'Nº venta del mes', value: l => l.saleMonthRank ?? '' },
        { label: 'Alícuota',    value: l => formatRate(l.rateApplied) },
        { label: 'Cobrado',     value: l => l.collectedAmount },
        { label: 'Comisión',    value: l => l.commissionAmount },
        { label: 'Mes anterior', value: l => l.fromPriorPeriod ? 'Sí' : 'No' },
      ])
  }

  return (
    <div className="comisiones">
      <div className="comisiones__toolbar">
        <div className="period-select">
          <label className="period-select__label">Período</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}>
            {yearRange(now.getFullYear()).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="period-select">
          <label className="period-select__label"><User size={14} strokeWidth={1.8} /> Vendedora</label>
          <select value={sellerId} onChange={e => setSellerId(e.target.value)}
            disabled={!sellers?.length}>
            <option value="">
              {sellers === null ? 'Cargando…'
                : sellers.length === 0 ? '— Sin ventas en el período —'
                : '— Seleccionar —'}
            </option>
            {sellers?.map(s => (
              // Si Keycloak admin está apagado el backend manda name null: se
              // muestra el id recortado antes que una fila en blanco.
              <option key={s.id} value={s.id}>{s.name ?? s.id.slice(0, 8)}</option>
            ))}
          </select>
        </div>

        {preview && preview.lines.length > 0 && (
          <button className="btn-ghost" type="button" onClick={handleExport}>
            <Download size={16} strokeWidth={2} /> Exportar detalle
          </button>
        )}
      </div>

      {!sellerId && (
        <EmptyState
          icon={Calculator}
          message={sellers?.length === 0 ? 'Sin ventas en el período' : 'Elegí una vendedora'}
          hint={sellers?.length === 0
            ? `No hay inscripciones cargadas por nadie en ${MONTHS[month - 1]} ${year}.`
            : 'La comisión se calcula sobre lo cobrado en el mes, no sobre lo facturado.'}
        />
      )}

      {sellerId && loading && <div className="comisiones__loading">Calculando…</div>}

      {sellerId && !loading && error && (
        <EmptyState icon={Calculator} message="No se pudo calcular la comisión" hint={error} />
      )}

      {sellerId && !loading && !error && preview && (
        <>
          <div className="comisiones__resumen">
            <table className="buckets-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th className="col-precio">Base cobrada</th>
                  <th className="col-rate">Alícuota</th>
                  <th className="col-precio">Comisión</th>
                </tr>
              </thead>
              <tbody>
                <BucketRow
                  label={`Cursos 1 a ${preview.tierThreshold}`}
                  base={preview.tier1Base} rate={preview.tier1Rate}
                  amount={preview.tier1Commission} />
                <BucketRow
                  label={`Cursos ${preview.tierThreshold + 1} en adelante`}
                  base={preview.tier2Base} rate={preview.tier2Rate}
                  amount={preview.tier2Commission} />
                <BucketRow
                  label="Libros y colecciones"
                  base={preview.booksBase} rate={preview.booksRate}
                  amount={preview.booksCommission} />
                <BucketRow
                  label="Ventas de meses anteriores"
                  base={preview.priorMonthsBase} rate={null}
                  amount={preview.priorMonthsCommission}
                  hint="Cuotas de ventas viejas que entraron este mes. Cada una conserva la alícuota de su mes de origen." />
              </tbody>
              <tfoot>
                <tr className="buckets-table__total">
                  <td colSpan={3}>Total a pagar</td>
                  <td className="col-precio">{formatPrice(preview.totalCommission)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="comisiones__acciones">
              {alreadySettled ? (
                <div className="comisiones__estado">
                  <span className={`badge ${statusBadgeClass(alreadySettled.status)}`}>
                    {SALES_COMMISSION_STATUS_LABELS[alreadySettled.status]}
                  </span>
                  <span className="muted small">
                    Liquidación ya generada por {formatPrice(alreadySettled.totalCommission)}
                  </span>
                  {canWrite && alreadySettled.status === 'DRAFT' && (
                    <>
                      <button className="btn-ghost" type="button"
                        onClick={() => handleAction(alreadySettled.id, 'recompute')}>
                        <RefreshCw size={15} /> Recalcular
                      </button>
                      <button className="btn-primary" type="button"
                        onClick={() => handleAction(alreadySettled.id, 'approve')}>
                        <BadgeCheck size={15} /> Aprobar
                      </button>
                    </>
                  )}
                  {canWrite && alreadySettled.status === 'APPROVED' && (
                    <button className="btn-primary" type="button"
                      onClick={() => handleAction(alreadySettled.id, 'mark-paid')}>
                      <CircleDollarSign size={15} /> Marcar pagada
                    </button>
                  )}
                </div>
              ) : canWrite && (
                <button className="btn-primary" type="button"
                  onClick={handleCreate} disabled={saving || preview.totalCommission <= 0}>
                  <Save size={15} /> {saving ? 'Generando…' : 'Generar liquidación'}
                </button>
              )}
            </div>
          </div>

          {preview.lines.length === 0 ? (
            <EmptyState icon={Calculator} message="Sin cobros en el período"
              hint="No entró plata de ninguna venta de esta vendedora en el mes elegido." />
          ) : (
            <div className="comisiones__detalle">
              <h4 className="comisiones__detalle-title">
                Detalle — {preview.lines.length} {preview.lines.length === 1 ? 'venta' : 'ventas'} con cobros en el mes
              </h4>
              <table className="detalle-table">
                <thead>
                  <tr>
                    <th className="col-num">Nº</th>
                    <th>Fecha</th>
                    <th>Alumno</th>
                    <th>Producto</th>
                    <th className="col-rate">Alícuota</th>
                    <th className="col-precio">Cobrado</th>
                    <th className="col-precio">Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.lines.map((l, i) => (
                    <tr key={l.sourceId + i} className={l.fromPriorPeriod ? 'is-prior' : ''}>
                      <td className="col-num">
                        {l.saleMonthRank ?? <span className="muted">—</span>}
                      </td>
                      <td className="td-date">{formatDate(l.saleDate)}</td>
                      <td>{l.studentName ?? <span className="muted">—</span>}</td>
                      <td>
                        <span className="producto">{l.productName ?? '—'}</span>
                        <span className="tipo-chip">{COMMISSION_SOURCE_LABELS[l.sourceType]}</span>
                        {l.fromPriorPeriod && <span className="tipo-chip tipo-chip--prior">mes anterior</span>}
                      </td>
                      <td className="col-rate">{formatRate(l.rateApplied)}</td>
                      <td className="col-precio">{formatPrice(l.collectedAmount)}</td>
                      {/* `.price` es inline-flex: va en un span ADENTRO de la celda.
                          Puesto en el <td> lo saca del layout de tabla y su borde
                          inferior deja de alinear con el de las otras columnas. */}
                      <td className="col-precio"><span className="price">{formatPrice(l.commissionAmount)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="comisiones__nota">
            <Info size={13} strokeWidth={1.8} />
            La base es lo <strong>cobrado</strong> en el mes, no lo facturado. La alícuota de cada
            venta queda fijada por su posición dentro del mes en que se vendió y se aplica a todas
            sus cuotas futuras. Los libros sueltos van siempre a {formatRate(preview.booksRate)} y
            no ocupan lugar en el conteo.
          </p>
        </>
      )}
    </div>
  )
}

function BucketRow(props: {
  label: string
  base: number
  rate: number | null
  amount: number
  hint?: string
}) {
  const empty = props.base === 0 && props.amount === 0
  return (
    <tr className={empty ? 'is-empty' : ''}>
      <td>
        {props.label}
        {props.hint && <span className="bucket-hint" title={props.hint}><Info size={12} /></span>}
      </td>
      <td className="col-precio">{formatPrice(props.base)}</td>
      <td className="col-rate">{props.rate != null ? formatRate(props.rate) : <span className="muted">varias</span>}</td>
      <td className="col-precio">{formatPrice(props.amount)}</td>
    </tr>
  )
}

function statusBadgeClass(s: string): string {
  switch (s) {
    case 'DRAFT':    return 'badge--pendiente'
    case 'APPROVED': return 'badge--suspendida'
    case 'PAID':     return 'badge--activo'
    default:         return ''
  }
}

/** Años ofrecidos: desde 2 atrás hasta el actual. */
function yearRange(current: number): number[] {
  return [current - 2, current - 1, current]
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

function formatDate(iso: string): string {
  // saleDate viene como yyyy-MM-dd; se parsea a mano para evitar el corrimiento
  // de zona horaria que mete `new Date('2026-06-03')` (lo interpreta como UTC).
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}
