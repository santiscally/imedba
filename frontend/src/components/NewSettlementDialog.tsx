import { useEffect, useMemo, useState } from 'react'
import { Calculator, FileSpreadsheet, GraduationCap, Clock, TrendingUp, X } from 'lucide-react'
import type { Diploma } from '../types/diploma'
import type { TeachingCandidate, TeachingSettlement } from '../types/teaching'
import type { CommissionSeller, SalesCommission } from '../types/sales-commission'
import { teachingApi } from '../api/teaching'
import { salesCommissionsApi } from '../api/sales-commissions'
import { formatHours } from '../types/teaching'
import { alertError, toastSuccess } from '../lib/confirm'
import './StudentForm.scss'
import './DiplomaForm.scss'
import './NewSettlementDialog.scss'

/**
 * Punto de entrada único para crear una liquidación (pedido 2026-07-24, 24:52):
 * «no hace falta que diga diplomaturas de liquidación, que sea liquidaciones
 * general y que elijas liquidar la diplomatura de prema, las horas docentes,
 * las ventas y comisiones».
 *
 * <p>Antes había que elegir una diplomatura en la pantalla ANTES de que se
 * habilitara el botón — justo lo que se marcó como innecesario en la llamada
 * (24:38 «ahí para liquidar dice seleccionar una diplomatura, esto no sería
 * necesario»). Ahora se elige el TIPO primero y el formulario cambia; para PREMA
 * la diplomatura pasó a ser un campo del propio formulario.
 */
export type SettlementKind = 'DIPLOMATURA' | 'HORAS' | 'COMISIONES'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const KINDS: { key: SettlementKind; label: string; desc: string; icon: typeof Calculator }[] = [
  { key: 'DIPLOMATURA', label: 'Diplomatura (PREMA)', icon: GraduationCap,
    desc: 'Reparto mensual entre directoras, IMEDBA y la universidad.' },
  { key: 'HORAS', label: 'Horas docentes', icon: Clock,
    desc: 'Docentes y preceptoras, según las clases cargadas en el mes.' },
  { key: 'COMISIONES', label: 'Ventas y comisiones', icon: TrendingUp,
    desc: 'Comisión de la vendedora sobre lo cobrado: cursos y libros.' },
]

interface Props {
  diplomas: Diploma[] | null
  /** Se llama con el tipo elegido y el resultado, para refrescar la lista correcta. */
  onCreated: (kind: SettlementKind) => void
  /** PREMA delega en SettlementForm, que ya tiene todos los campos del reparto. */
  onPickDiploma: (d: Diploma) => void
  onClose: () => void
}

export default function NewSettlementDialog({ diplomas, onCreated, onPickDiploma, onClose }: Props) {
  const [kind, setKind] = useState<SettlementKind | null>(null)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><FileSpreadsheet size={18} /></div>
            <h3 className="modal__title">Nueva liquidación</h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="new-settlement">
          <p className="form__hint">¿Qué querés liquidar?</p>
          <div className="kind-picker">
            {KINDS.map(k => (
              <button
                key={k.key}
                type="button"
                className={`kind-card ${kind === k.key ? 'kind-card--active' : ''}`}
                onClick={() => setKind(k.key)}
              >
                <span className="kind-card__icon"><k.icon size={18} strokeWidth={1.9} /></span>
                <span className="kind-card__label">{k.label}</span>
                <span className="kind-card__desc">{k.desc}</span>
              </button>
            ))}
          </div>

          {kind === 'DIPLOMATURA' && (
            <DiplomaStep diplomas={diplomas} onPick={onPickDiploma} />
          )}
          {kind === 'HORAS' && (
            <TeachingStep onDone={() => onCreated('HORAS')} />
          )}
          {kind === 'COMISIONES' && (
            <CommissionStep onDone={() => onCreated('COMISIONES')} />
          )}
        </div>
      </div>
    </div>
  )
}


/**
 * Arranca en el mes anterior, pero si está vacío retrocede hasta encontrar uno con
 * datos (máx. 6 meses). Sin esto el diálogo abría siempre en el mes pasado y, si la
 * carga viene demorada, mostraba «no hay nada» aunque sí hubiera meses liquidables
 * — que es exactamente cómo se veía roto.
 */
function useLatestPeriodWith<T>(
  fetch: (year: number, month: number) => Promise<T[]>,
): { year: number; month: number; items: T[] | null; setYear: (n: number) => void; setMonth: (n: number) => void } {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const [year, setYear] = useState(prev.getFullYear())
  const [month, setMonth] = useState(prev.getMonth() + 1)
  const [items, setItems] = useState<T[] | null>(null)
  const [probed, setProbed] = useState(false)

  useEffect(() => {
    let alive = true
    setItems(null)
    ;(async () => {
      let y = year, m = month
      for (let i = 0; i < (probed ? 1 : 6); i++) {
        let got: T[] = []
        try { got = await fetch(y, m) } catch { got = [] }
        if (!alive) return
        if (got.length || i === (probed ? 0 : 5)) {
          if (y !== year || m !== month) { setYear(y); setMonth(m) }
          setItems(got)
          setProbed(true)
          return
        }
        m -= 1
        if (m === 0) { m = 12; y -= 1 }
      }
    })()
    return () => { alive = false }
    // `probed` fuera de deps a propósito: una vez que el usuario ve un período,
    // cambiarlo a mano no debe volver a disparar la búsqueda hacia atrás.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  return { year, month, items, setYear, setMonth }
}

/** Selector de período reutilizado por los dos pasos que liquidan por mes. */
function PeriodPicker({ year, month, setYear, setMonth }: {
  year: number; month: number
  setYear: (n: number) => void; setMonth: (n: number) => void
}) {
  const thisYear = new Date().getFullYear()
  return (
    <div className="form__grid">
      <Field label="Mes" required>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </Field>
      <Field label="Año" required>
        <select value={year} onChange={e => setYear(Number(e.target.value))}>
          {[thisYear - 2, thisYear - 1, thisYear].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </Field>
    </div>
  )
}

// ─── PREMA ────────────────────────────────────────────────────────────────────

function DiplomaStep({ diplomas, onPick }: { diplomas: Diploma[] | null; onPick: (d: Diploma) => void }) {
  const [id, setId] = useState('')
  const chosen = useMemo(() => diplomas?.find(d => d.id === id) ?? null, [diplomas, id])

  if (diplomas && diplomas.length === 0) {
    return (
      <div className="new-settlement__empty">
        No hay diplomaturas activas. Cargá una en <strong>Académico → Diplomaturas</strong>,
        con sus directoras tomadas de <strong>Personal Académico</strong>.
      </div>
    )
  }

  return (
    <div className="new-settlement__step">
      <Field label="Diplomatura" required fullWidth>
        <select value={id} onChange={e => setId(e.target.value)}>
          <option value="">— Elegir —</option>
          {(diplomas ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>

      {chosen && (
        <div className="new-settlement__note">
          {chosen.directors?.length
            ? <>Reparte entre <strong>{chosen.directors.length}</strong> directora
                {chosen.directors.length === 1 ? '' : 's'} en partes iguales:{' '}
                {chosen.directors.map(d => d.name).join(', ')}.</>
            : <><strong>Ojo:</strong> no tiene directoras cargadas. Asignalas en la diplomatura
                (se eligen de Personal Académico) o esa mitad queda sin repartir.</>}
        </div>
      )}

      <div className="form__footer">
        <button type="button" className="btn-primary" disabled={!chosen}
          onClick={() => chosen && onPick(chosen)}>
          Continuar
        </button>
      </div>
    </div>
  )
}

// ─── Horas docentes ───────────────────────────────────────────────────────────

function TeachingStep({ onDone }: { onDone: () => void }) {
  const { year, month, items: candidates, setYear, setMonth } =
    useLatestPeriodWith<TeachingCandidate>(teachingApi.candidates)

  const [picked, setPicked] = useState<TeachingCandidate | null>(null)
  const [preview, setPreview] = useState<TeachingSettlement | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setPicked(null); setPreview(null) }, [year, month])

  useEffect(() => {
    if (!picked) { setPreview(null); return }
    teachingApi.preview(picked.staffId, picked.role, year, month)
      .then(setPreview).catch(() => setPreview(null))
  }, [picked, year, month])

  async function generate() {
    if (!picked) return
    setSaving(true)
    try {
      await teachingApi.createSettlement({
        staffId: picked.staffId, role: picked.role, periodMonth: month, periodYear: year,
      })
      toastSuccess('Liquidación generada')
      onDone()
    } catch (err) {
      alertError('No se pudo generar', err instanceof Error ? err.message : undefined)
    } finally { setSaving(false) }
  }

  const eligible = (candidates ?? []).filter(c => c.paidByHours && !c.alreadySettled)

  return (
    <div className="new-settlement__step">
      <PeriodPicker year={year} month={month} setYear={setYear} setMonth={setMonth} />

      {candidates?.length === 0 && (
        <div className="new-settlement__empty">
          No hay clases sincrónicas cargadas en <strong>{MONTHS[month - 1]} {year}</strong>.
          Se cargan desde <strong>Académico → Clases</strong>.
        </div>
      )}

      {!!candidates?.length && (
        <Field label="A quién liquidar" required fullWidth>
          <select value={picked ? `${picked.staffId}|${picked.role}` : ''}
            onChange={e => {
              const [sid, role] = e.target.value.split('|')
              setPicked((candidates ?? []).find(c => c.staffId === sid && c.role === role) ?? null)
            }}>
            <option value="">— Elegir —</option>
            {candidates.map(c => (
              <option key={`${c.staffId}|${c.role}`} value={`${c.staffId}|${c.role}`}
                disabled={!c.paidByHours || c.alreadySettled}>
                {c.staffName} · {c.role === 'DOCENTE' ? 'Docente' : 'Preceptora'} · {c.classCount} clase{c.classCount === 1 ? '' : 's'}
                {!c.paidByHours ? ' — sueldo fijo, no liquida' : c.alreadySettled ? ' — ya liquidada' : ''}
              </option>
            ))}
          </select>
        </Field>
      )}

      {!!eligible.length && eligible.length < (candidates?.length ?? 0) && (
        <div className="new-settlement__note">
          Las que dicen «sueldo fijo» no entran en la liquidación por horas — se destilda
          en Personal Académico si eso cambia.
        </div>
      )}

      {preview && (
        <div className="new-settlement__preview">
          <Row label="Clases" value={String(preview.classCount)} />
          <Row label="Horas de clase" value={formatHours(preview.totalHours)} />
          {preview.role === 'PRECEPTORA' && (
            <Row label="Bonus por clase (0,25 h)" value={formatHours(preview.bonusHours)} />
          )}
          <Row label="Horas a pagar" value={formatHours(preview.billableHours)} />
          <Row label="Valor hora" value={money(preview.hourlyRate)} />
          <Row label="Total" value={money(preview.totalAmount)} strong />
        </div>
      )}

      <div className="form__footer">
        <button type="button" className="btn-primary" disabled={!picked || saving} onClick={generate}>
          {saving ? 'Generando…' : 'Generar liquidación'}
        </button>
      </div>
    </div>
  )
}

// ─── Ventas y comisiones ──────────────────────────────────────────────────────

function CommissionStep({ onDone }: { onDone: () => void }) {
  const { year, month, items: sellers, setYear, setMonth } =
    useLatestPeriodWith<CommissionSeller>(salesCommissionsApi.sellers)

  const [sellerId, setSellerId] = useState('')
  const [preview, setPreview] = useState<SalesCommission | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setSellerId(''); setPreview(null) }, [year, month])

  useEffect(() => {
    if (!sellerId) { setPreview(null); return }
    salesCommissionsApi.preview({ sellerUserId: sellerId, year, month })
      .then(setPreview).catch(() => setPreview(null))
  }, [sellerId, year, month])

  async function generate() {
    if (!sellerId) return
    setSaving(true)
    try {
      await salesCommissionsApi.create({
        sellerUserId: sellerId,
        sellerName: sellers?.find(s => s.id === sellerId)?.name ?? null,
        periodMonth: month, periodYear: year,
      })
      toastSuccess('Liquidación generada')
      onDone()
    } catch (err) {
      alertError('No se pudo generar', err instanceof Error ? err.message : undefined)
    } finally { setSaving(false) }
  }

  return (
    <div className="new-settlement__step">
      <PeriodPicker year={year} month={month} setYear={setYear} setMonth={setMonth} />

      {sellers?.length === 0 && (
        <div className="new-settlement__empty">
          Nadie registró cobros en <strong>{MONTHS[month - 1]} {year}</strong>. La comisión sale
          de lo <strong>cobrado</strong> en el mes, no de lo facturado.
        </div>
      )}

      {!!sellers?.length && (
        <Field label="Vendedora" required fullWidth>
          <select value={sellerId} onChange={e => setSellerId(e.target.value)}>
            <option value="">— Elegir —</option>
            {sellers.map(s => <option key={s.id} value={s.id}>{s.name ?? s.id}</option>)}
          </select>
        </Field>
      )}

      {preview && (
        <div className="new-settlement__preview">
          <Row label={`Primeras ${preview.tierThreshold} ventas (${pct(preview.tier1Rate)})`}
               value={money(preview.tier1Commission)} hint={`sobre ${money(preview.tier1Base)}`} />
          <Row label={`De la ${preview.tierThreshold + 1} en adelante (${pct(preview.tier2Rate)})`}
               value={money(preview.tier2Commission)} hint={`sobre ${money(preview.tier2Base)}`} />
          <Row label={`Libros (${pct(preview.booksRate)})`}
               value={money(preview.booksCommission)} hint={`sobre ${money(preview.booksBase)}`} />
          {Number(preview.priorMonthsCommission) > 0 && (
            <Row label="Meses anteriores" value={money(preview.priorMonthsCommission)} />
          )}
          <Row label="Total" value={money(preview.totalCommission)} strong />
        </div>
      )}

      <div className="form__footer">
        <button type="button" className="btn-primary" disabled={!sellerId || saving} onClick={generate}>
          {saving ? 'Generando…' : 'Generar liquidación'}
        </button>
      </div>
    </div>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function Row({ label, value, hint, strong }: {
  label: string; value: string; hint?: string; strong?: boolean
}) {
  return (
    <div className={`preview-row ${strong ? 'preview-row--strong' : ''}`}>
      <span className="preview-row__label">
        {label}
        {hint && <em className="preview-row__hint">{hint}</em>}
      </span>
      <span className="preview-row__value">{value}</span>
    </div>
  )
}

function money(v: number | string | null | undefined): string {
  if (v == null) return '—'
  return `$${Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pct(v: number | string | null | undefined): string {
  if (v == null) return '—'
  // Las tasas vienen como fracción (0.005) y se muestran como porcentaje.
  return `${(Number(v) * 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`
}

/** Mismo markup que el Field local de los otros forms — no hay componente compartido. */
function Field(props: {
  label: string
  required?: boolean
  fullWidth?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`field ${props.fullWidth ? 'field--full' : ''}`}>
      <label className="field__label">
        {props.label}
        {props.required && <span className="field__required">*</span>}
      </label>
      {props.children}
    </div>
  )
}
