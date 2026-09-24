import { useState, type FormEvent, type ReactNode } from 'react'
import { X, Save, CalendarPlus } from 'lucide-react'
import type { Commission, CommissionRequest } from '../types/diploma'
import type { Modality } from '../types/course'
import { BUSINESS_UNIT_LABELS, MODALITIES, MODALITY_LABELS } from '../types/course'
import {
  commissionPayload, commissionState, validateCommission,
  type CommissionErrors, type CommissionState,
} from '../lib/commission'
import './StudentForm.scss'

// Mismos datos que el alta de un curso (matrícula, curso, libro, comisión, unidad), pedido del docx 2026-09-24.
export function CommissionFields({ state, errors, onChange }: {
  state:    CommissionState
  errors:   CommissionErrors
  onChange: <K extends keyof CommissionState>(key: K, value: CommissionState[K]) => void
}) {
  return (
    <div className="form__grid">
      <Field label="Comisión" required error={errors.commission}>
        <input type="number" step="1" value={state.commission}
          onChange={e => onChange('commission', e.target.value)} placeholder="11" />
      </Field>
      <Field label="Año" error={errors.academicYear}>
        <input type="number" step="1" value={state.academicYear}
          onChange={e => onChange('academicYear', e.target.value)} placeholder="2026" />
      </Field>
      <Field label="Inicio" required error={errors.startDate}>
        <input type="date" value={state.startDate}
          onChange={e => onChange('startDate', e.target.value)} />
      </Field>
      <Field label="Cierre" required error={errors.endDate}>
        <input type="date" value={state.endDate} min={state.startDate || undefined}
          onChange={e => onChange('endDate', e.target.value)} />
      </Field>
      <Field label="Matrícula (ARS)" error={errors.enrollmentPrice}>
        <input type="number" step="any" value={state.enrollmentPrice}
          onChange={e => onChange('enrollmentPrice', e.target.value)} placeholder="250000" />
      </Field>
      <Field label="Precio curso (ARS)" error={errors.coursePrice}>
        <input type="number" step="any" value={state.coursePrice}
          onChange={e => onChange('coursePrice', e.target.value)} placeholder="2400000" />
      </Field>
      <Field label="Modalidad">
        <select value={state.modality} onChange={e => onChange('modality', e.target.value as Modality | '')}>
          <option value="">— Sin especificar —</option>
          {MODALITIES.map(m => <option key={m} value={m}>{MODALITY_LABELS[m]}</option>)}
        </select>
      </Field>
      <Field label="Unidad de negocio">
        <input type="text" value={BUSINESS_UNIT_LABELS.FORMACION_SUPERIOR} readOnly />
      </Field>
      <Field label="Libro" fullWidth>
        <label className="checkbox-row__opt" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={state.includesPremaBook}
            onChange={e => onChange('includesPremaBook', e.target.checked)} />
          <span>
            <strong>Incluye libro PREMA en la matrícula</strong>
            <div style={{ fontSize: '0.8rem', opacity: 0.75 }}>
              Al inscribir un alumno se descuenta 1 ejemplar del stock (sin cargo extra).
            </div>
          </span>
        </label>
      </Field>
    </div>
  )
}

interface Props {
  diplomaName: string
  initial?:    Commission
  onClose:     () => void
  onSaved:     (saved: Commission) => void
  onSubmit:    (payload: CommissionRequest) => Promise<Commission>
}

export default function CommissionForm({ diplomaName, initial, onClose, onSaved, onSubmit }: Props) {
  const [state,       setState]       = useState<CommissionState>(commissionState(initial))
  const [errors,      setErrors]      = useState<CommissionErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)

  function setField<K extends keyof CommissionState>(key: K, value: CommissionState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    const e = validateCommission(state)
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setSaving(true); setSubmitError(null)
    try {
      onSaved(await onSubmit(commissionPayload(state, initial)))
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  const Icon = initial ? Save : CalendarPlus
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={ev => ev.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><Icon size={18} /></div>
            <h3 className="modal__title">
              {initial ? `Editar comisión ${initial.commission ?? '(sin número)'}` : 'Nueva comisión'} · {diplomaName}
            </h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="form">
          <CommissionFields state={state} errors={errors} onChange={setField} />
          {submitError && <div className="form__error">{submitError}</div>}
          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear comisión'}
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
  children:   ReactNode
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
