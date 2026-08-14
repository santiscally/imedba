import { useState, type FormEvent } from 'react'
import { X, FileSpreadsheet } from 'lucide-react'
import type {
  DiplomaSettlement,
  DiplomaSettlementCreateRequest,
} from '../types/diploma-settlement'
import type { Diploma } from '../types/diploma'
import './StudentForm.scss'
import './DiplomaForm.scss'

interface Props {
  diploma:  Diploma
  onClose:  () => void
  onSaved:  (saved: DiplomaSettlement) => void
  onSubmit: (payload: DiplomaSettlementCreateRequest) => Promise<DiplomaSettlement>
}

const MONTHS = [
  'Enero',   'Febrero', 'Marzo',     'Abril',
  'Mayo',    'Junio',   'Julio',     'Agosto',
  'Septiembre','Octubre','Noviembre','Diciembre',
]

/**
 * Inputs de la liquidación (fórmula V035, doc 17 §3.3). Todos se cargan acá, no en
 * la diplomatura. Los cuatro gastos administrativos son MONTOS FIJOS, no porcentajes
 * — administración era un % antes de V035 y por eso el cálculo daba mal.
 */
interface FormState {
  periodMonth:          number
  periodYear:           number
  totalCollected:       string
  taxPct:               string   // impuestos y gastos bancarios (PRIMER descuento)
  secretaryAmount:      string
  advertisingAmount:    string
  administrationAmount: string
  miscExpensesAmount:   string   // GASTOS VARIOS
  recordingsAmount:     string   // grabaciones docentes (sale de la mitad de directoras)
  imedbaPct:            string   // default 80
  untrefPct:            string   // default 20
}

function initialState(): FormState {
  // Se liquida el mes cerrado, así que el default es el mes anterior.
  const prev = new Date()
  prev.setMonth(prev.getMonth() - 1)
  return {
    periodMonth:          prev.getMonth() + 1,
    periodYear:           prev.getFullYear(),
    totalCollected:       '',
    taxPct:               '',
    secretaryAmount:      '',
    advertisingAmount:    '',
    administrationAmount: '',
    miscExpensesAmount:   '',
    recordingsAmount:     '',
    imedbaPct:            '',
    untrefPct:            '',
  }
}

export default function SettlementForm({ diploma, onClose, onSaved, onSubmit }: Props) {
  const [state,       setState]       = useState<FormState>(initialState())
  const [errors,      setErrors]      = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  // Con curso vinculado, el total puede quedar vacío: el backend suma los pagos
  // del período de las inscripciones de ese curso (V026).
  const hasLinkedCourse = diploma.courseId != null

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!state.totalCollected) {
      if (!hasLinkedCourse) e.totalCollected = 'Obligatorio (la diplomatura no tiene curso vinculado)'
    } else if (Number.isNaN(Number(state.totalCollected))) {
      e.totalCollected = 'No es un número válido'
    }
    if (!state.periodYear) e.periodYear = 'Obligatorio'
    if (!state.periodMonth) e.periodMonth = 'Obligatorio'
    const checkNum = (f: keyof FormState) => {
      const v = state[f] as string
      if (!v) return
      if (Number.isNaN(Number(v))) e[f] = 'No es un número válido'
    }
    checkNum('taxPct')
    checkNum('secretaryAmount')
    checkNum('advertisingAmount')
    checkNum('administrationAmount')
    checkNum('miscExpensesAmount')
    checkNum('recordingsAmount')
    checkNum('imedbaPct')
    checkNum('untrefPct')

    // El reparto de la mitad no-directoras tiene que sumar 100: si no, hay plata
    // que no va a ningún lado y el usuario no se entera.
    const imedba = state.imedbaPct ? Number(state.imedbaPct) : 80
    const untref = state.untrefPct ? Number(state.untrefPct) : 20
    if (!Number.isNaN(imedba) && !Number.isNaN(untref) && imedba + untref !== 100) {
      e.imedbaPct = `IMEDBA + UNTREF debe dar 100 (ahora da ${imedba + untref})`
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const numOrNull = (v: string) => (v ? Number(v) : null)
    const payload: DiplomaSettlementCreateRequest = {
      diplomaId:            diploma.id,
      periodMonth:          state.periodMonth,
      periodYear:           state.periodYear,
      totalCollected:       state.totalCollected ? Number(state.totalCollected) : null,
      taxPct:               numOrNull(state.taxPct),
      secretaryAmount:      numOrNull(state.secretaryAmount),
      advertisingAmount:    numOrNull(state.advertisingAmount),
      administrationAmount: numOrNull(state.administrationAmount),
      miscExpensesAmount:   numOrNull(state.miscExpensesAmount),
      recordingsAmount:     numOrNull(state.recordingsAmount),
      imedbaPct:            numOrNull(state.imedbaPct),
      untrefPct:            numOrNull(state.untrefPct),
    }

    try {
      const saved = await onSubmit(payload)
      onSaved(saved)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={ev => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><FileSpreadsheet size={18} /></div>
            <h3 className="modal__title">Nueva liquidación</h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="form__hint">
            Liquidación de <strong>{diploma.name}</strong>. Se descuentan primero los impuestos,
            después los cuatro gastos fijos, y lo que queda se parte <strong>50/50</strong>: una
            mitad para las directoras (menos las grabaciones) y la otra 80% IMEDBA / 20% UNTREF.
            {diploma.directors?.length
              ? <> Reparte entre <strong>{diploma.directors.length}</strong> directora
                  {diploma.directors.length === 1 ? '' : 's'} en partes iguales.</>
              : <> <strong>Ojo:</strong> esta diplomatura no tiene directoras cargadas, así que esa
                  mitad va a quedar sin repartir.</>}
            {' '}Queda en <em>Borrador</em> hasta aprobarse.
          </div>

          <h4 className="form-section">Período</h4>
          <div className="form__grid">
            <Field label="Mes" required error={errors.periodMonth}>
              <select
                value={state.periodMonth}
                onChange={e => setField('periodMonth', Number(e.target.value))}
              >
                {MONTHS.map((label, i) => (
                  <option key={i} value={i + 1}>{label}</option>
                ))}
              </select>
            </Field>

            <Field label="Año" required error={errors.periodYear}>
              <input
                type="number"
                step="1"
                value={state.periodYear}
                onChange={e => setField('periodYear', Number(e.target.value))}
              />
            </Field>

            <Field label="Total cobrado (ARS)" required={!hasLinkedCourse} error={errors.totalCollected} fullWidth>
              <input
                type="number" step="any"
                value={state.totalCollected}
                onChange={e => setField('totalCollected', e.target.value)}
                autoFocus
                placeholder={hasLinkedCourse ? 'Vacío = suma automática de los pagos del período' : '5500000'}
              />
              {hasLinkedCourse && (
                <span className="field__hint">
                  Vinculada al curso <strong>{diploma.courseName}</strong>: si lo dejás vacío se suma
                  automáticamente lo cobrado en el período por sus inscripciones. "Recomputar" lo refresca.
                </span>
              )}
            </Field>
          </div>

          <h4 className="form-section">1 · Impuestos y gastos bancarios</h4>
          <div className="form__grid">
            <Field label="Impuestos (%)" error={errors.taxPct} fullWidth>
              <input
                type="number" step="0.01"
                value={state.taxPct}
                onChange={e => setField('taxPct', e.target.value)}
                placeholder="15"
              />
              <span className="field__hint">
                Es el primer descuento y se aplica sobre lo cobrado.
              </span>
            </Field>
          </div>

          <h4 className="form-section">2 · Gastos administrativos (montos fijos)</h4>
          <div className="form__grid">
            <Field label="Secretaría (ARS)" error={errors.secretaryAmount}>
              <input
                type="number" step="any"
                value={state.secretaryAmount}
                onChange={e => setField('secretaryAmount', e.target.value)}
                placeholder="180000"
              />
            </Field>
            <Field label="Publicidad (ARS)" error={errors.advertisingAmount}>
              <input
                type="number" step="any"
                value={state.advertisingAmount}
                onChange={e => setField('advertisingAmount', e.target.value)}
                placeholder="90000"
              />
            </Field>
            <Field label="Administración (ARS)" error={errors.administrationAmount}>
              <input
                type="number" step="any"
                value={state.administrationAmount}
                onChange={e => setField('administrationAmount', e.target.value)}
                placeholder="50000"
              />
            </Field>
            <Field label="Gastos varios (ARS)" error={errors.miscExpensesAmount}>
              <input
                type="number" step="any"
                value={state.miscExpensesAmount}
                onChange={e => setField('miscExpensesAmount', e.target.value)}
                placeholder="20000"
              />
            </Field>
          </div>

          <h4 className="form-section">3 · Reparto del subtotal (50/50)</h4>
          <div className="form__grid">
            <Field label="Grabaciones docentes (ARS)" error={errors.recordingsAmount} fullWidth>
              <input
                type="number" step="any"
                value={state.recordingsAmount}
                onChange={e => setField('recordingsAmount', e.target.value)}
                placeholder="0"
              />
              <span className="field__hint">
                Se descuenta <strong>sólo de la mitad de las directoras</strong>, no del total.
              </span>
            </Field>
            <Field label="IMEDBA (%)" error={errors.imedbaPct}>
              <input
                type="number" step="0.01"
                value={state.imedbaPct}
                onChange={e => setField('imedbaPct', e.target.value)}
                placeholder="80 (por defecto)"
              />
            </Field>
            <Field label="UNTREF (%)" error={errors.untrefPct}>
              <input
                type="number" step="0.01"
                value={state.untrefPct}
                onChange={e => setField('untrefPct', e.target.value)}
                placeholder="20 (por defecto)"
              />
              <span className="field__hint">
                Se acumula: no se paga este mes, se salda al cerrar la comisión.
              </span>
            </Field>
          </div>

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Generando…' : 'Generar borrador'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function Field(props: {
  label:      string
  required?:  boolean
  error?:     string
  fullWidth?: boolean
  children:   React.ReactNode
}) {
  return (
    <div className={`field ${props.fullWidth ? 'field--full' : ''} ${props.error ? 'field--error' : ''}`}>
      <label className="field__label">
        {props.label}
        {props.required && <span className="field__required">*</span>}
      </label>
      {props.children}
      {props.error && <div className="field__error">{props.error}</div>}
    </div>
  )
}
