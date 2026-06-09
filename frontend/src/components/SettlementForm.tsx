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

interface FormState {
  periodMonth:       number
  periodYear:        number
  totalCollected:    string
  // Inputs por liquidación (vacío = usa el valor de la diplomatura).
  taxCommissionPct:  string
  secretarySalary:   string
  advertisingAmount: string
  adminPct:          string
  universityPct:     string
  imedbaPct:         string
}

function initialState(): FormState {
  const today = new Date()
  return {
    periodMonth:       today.getMonth() + 1,
    periodYear:        today.getFullYear(),
    totalCollected:    '',
    taxCommissionPct:  '',
    secretarySalary:   '',
    advertisingAmount: '',
    adminPct:          '',
    universityPct:     '',
    imedbaPct:         '',
  }
}

// Placeholder con el valor de la diplomatura (el fallback) o un genérico.
function ph(v: number | null | undefined, fallback: string): string {
  return v != null ? `${v} (diplomatura)` : fallback
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
    checkNum('taxCommissionPct')
    checkNum('secretarySalary')
    checkNum('advertisingAmount')
    checkNum('adminPct')
    checkNum('universityPct')
    checkNum('imedbaPct')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const numOrNull = (v: string) => (v ? Number(v) : null)
    const payload: DiplomaSettlementCreateRequest = {
      diplomaId:         diploma.id,
      periodMonth:       state.periodMonth,
      periodYear:        state.periodYear,
      totalCollected:    state.totalCollected ? Number(state.totalCollected) : null,
      taxCommissionPct:  numOrNull(state.taxCommissionPct),
      secretarySalary:   numOrNull(state.secretarySalary),
      advertisingAmount: numOrNull(state.advertisingAmount),
      adminPct:          numOrNull(state.adminPct),
      universityPct:     numOrNull(state.universityPct),
      imedbaPct:         numOrNull(state.imedbaPct),
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
            Liquidación de <strong>{diploma.name}</strong>. Los costos fijos y el reparto se cargan
            <strong> por liquidación</strong> (no en la diplomatura). Lo que dejes vacío toma el valor
            de la diplomatura. El reparto entre directoras, universidad, IMEDBA y administración se
            calcula automáticamente — queda en <em>Borrador</em> hasta aprobarse.
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

          <h4 className="form-section">Costos fijos del período</h4>
          <div className="form__grid">
            <Field label="Comisión impuestos (%)" error={errors.taxCommissionPct}>
              <input
                type="number" step="0.01"
                value={state.taxCommissionPct}
                onChange={e => setField('taxCommissionPct', e.target.value)}
                placeholder={ph(diploma.taxCommissionPct, '15')}
              />
            </Field>
            <Field label="Sueldo secretaria (ARS)" error={errors.secretarySalary}>
              <input
                type="number" step="any"
                value={state.secretarySalary}
                onChange={e => setField('secretarySalary', e.target.value)}
                placeholder={ph(diploma.secretarySalary, '180000')}
              />
            </Field>
            <Field label="Publicidad (ARS)" error={errors.advertisingAmount}>
              <input
                type="number" step="any"
                value={state.advertisingAmount}
                onChange={e => setField('advertisingAmount', e.target.value)}
                placeholder={ph(diploma.advertisingAmount, '90000')}
              />
            </Field>
          </div>

          <h4 className="form-section">Reparto institucional (%)</h4>
          <div className="form__grid">
            <Field label="Administración (%)" error={errors.adminPct}>
              <input
                type="number" step="0.01"
                value={state.adminPct}
                onChange={e => setField('adminPct', e.target.value)}
                placeholder={ph(diploma.adminPct, '10')}
              />
            </Field>
            <Field label="Universidad (%)" error={errors.universityPct}>
              <input
                type="number" step="0.01"
                value={state.universityPct}
                onChange={e => setField('universityPct', e.target.value)}
                placeholder={ph(diploma.universityPct, '30')}
              />
            </Field>
            <Field label="IMEDBA (%)" error={errors.imedbaPct}>
              <input
                type="number" step="0.01"
                value={state.imedbaPct}
                onChange={e => setField('imedbaPct', e.target.value)}
                placeholder={ph(diploma.imedbaPct, '15')}
              />
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
