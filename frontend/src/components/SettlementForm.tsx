import { useState, type FormEvent } from 'react'
import { X, FileSpreadsheet } from 'lucide-react'
import type {
  DiplomaSettlement,
  DiplomaSettlementCreateRequest,
} from '../types/diploma-settlement'
import type { Diploma } from '../types/diploma'
import './StudentForm.scss'

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
  periodMonth:    number
  periodYear:     number
  totalCollected: string
}

function initialState(): FormState {
  const today = new Date()
  return {
    periodMonth:    today.getMonth() + 1,
    periodYear:     today.getFullYear(),
    totalCollected: '',
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

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!state.totalCollected) {
      e.totalCollected = 'Obligatorio'
    } else {
      const n = Number(state.totalCollected)
      if (Number.isNaN(n) || n < 0) e.totalCollected = 'Debe ser ≥ 0'
    }
    if (!state.periodYear || state.periodYear < 2020 || state.periodYear > 2100) {
      e.periodYear = 'Año entre 2020 y 2100'
    }
    if (!state.periodMonth || state.periodMonth < 1 || state.periodMonth > 12) {
      e.periodMonth = 'Mes entre 1 y 12'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const payload: DiplomaSettlementCreateRequest = {
      diplomaId:      diploma.id,
      periodMonth:    state.periodMonth,
      periodYear:     state.periodYear,
      totalCollected: Number(state.totalCollected),
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
            Liquidación de <strong>{diploma.name}</strong>. El reparto entre socias, universidad,
            IMEDBA y administración se calcula automáticamente con los porcentajes configurados
            en la diplomatura — queda en estado <em>Borrador</em> hasta que se apruebe.
          </div>

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
                min="2020"
                max="2100"
                step="1"
                value={state.periodYear}
                onChange={e => setField('periodYear', Number(e.target.value))}
              />
            </Field>

            <Field label="Total cobrado (ARS)" required error={errors.totalCollected} fullWidth>
              <input
                type="number" min="0" step="any"
                value={state.totalCollected}
                onChange={e => setField('totalCollected', e.target.value)}
                autoFocus
                placeholder="5500000"
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
