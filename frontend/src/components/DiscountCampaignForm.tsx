import { useState, type FormEvent } from 'react'
import { X, Save, TicketPercent } from 'lucide-react'
import type {
  DiscountCampaign,
  DiscountCampaignCreateRequest,
  DiscountCampaignUpdateRequest,
  DiscountType,
} from '../types/discount-campaign'
import { DISCOUNT_TYPES, DISCOUNT_TYPE_LABELS } from '../types/discount-campaign'
import './StudentForm.scss'

type Payload = DiscountCampaignCreateRequest | DiscountCampaignUpdateRequest

interface Props {
  mode:     'create' | 'edit'
  initial?: DiscountCampaign
  onClose:  () => void
  onSaved:  (saved: DiscountCampaign) => void
  onSubmit: (payload: Payload) => Promise<DiscountCampaign>
}

interface FormState {
  name:          string
  description:   string
  discountType:  DiscountType
  discountValue: string
  startDate:     string
  endDate:       string
}

function initialState(c?: DiscountCampaign): FormState {
  return {
    name:          c?.name         ?? '',
    description:   c?.description  ?? '',
    discountType:  c?.discountType ?? 'PERCENTAGE',
    discountValue: c?.discountValue != null ? String(c.discountValue) : '',
    startDate:     c?.startDate    ?? '',
    endDate:       c?.endDate      ?? '',
  }
}

export default function DiscountCampaignForm({ mode, initial, onClose, onSaved, onSubmit }: Props) {
  const [state,       setState]       = useState<FormState>(initialState(initial))
  const [errors,      setErrors]      = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!state.name.trim())      e.name = 'Obligatorio'
    if (state.name.length > 200) e.name = 'Máx 200 caracteres'

    if (!state.discountValue) {
      e.discountValue = 'Obligatorio'
    } else {
      const n = Number(state.discountValue)
      if (Number.isNaN(n)) {
        e.discountValue = 'No es un número válido'
      }
    }

    // Backend exige ambas fechas (@NotNull).
    if (!state.startDate)      e.startDate = 'Obligatorio'
    if (!state.endDate)        e.endDate   = 'Obligatorio'
    if (state.startDate && state.endDate && state.startDate > state.endDate) {
      e.endDate = 'Debe ser posterior a "Vigente desde"'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const payload: Payload = {
      name:          state.name.trim(),
      description:   state.description.trim() || null,
      discountType:  state.discountType,
      discountValue: Number(state.discountValue),
      startDate:     state.startDate,
      endDate:       state.endDate,
    }

    try {
      const saved = await onSubmit(payload)
      onSaved(saved)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  const isCreate = mode === 'create'
  const Icon     = isCreate ? TicketPercent : Save
  const valueLabel = state.discountType === 'PERCENTAGE'
    ? 'Porcentaje (%)'
    : 'Monto fijo (ARS)'
  const valuePlaceholder = state.discountType === 'PERCENTAGE' ? '15' : '50000'

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
            <div className="modal__title-icon"><Icon size={18} /></div>
            <h3 className="modal__title">
              {isCreate ? 'Nueva campaña de descuento' : 'Editar campaña'}
            </h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="form__grid">
            <Field label="Nombre" required error={errors.name} fullWidth>
              <input
                type="text"
                value={state.name}
                onChange={e => setField('name', e.target.value)}
                maxLength={200}
                autoFocus
                placeholder="Pago único por transferencia"
              />
            </Field>

            <Field label="Tipo de descuento" required>
              <select
                value={state.discountType}
                onChange={e => setField('discountType', e.target.value as DiscountType)}
              >
                {DISCOUNT_TYPES.map(t => (
                  <option key={t} value={t}>{DISCOUNT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </Field>

            <Field label={valueLabel} required error={errors.discountValue}>
              <input
                type="number"
                step={state.discountType === 'PERCENTAGE' ? '0.01' : 'any'}
                value={state.discountValue}
                onChange={e => setField('discountValue', e.target.value)}
                placeholder={valuePlaceholder}
              />
            </Field>

            <Field label="Vigente desde" required error={errors.startDate}>
              <input
                type="date"
                value={state.startDate}
                onChange={e => setField('startDate', e.target.value)}
              />
            </Field>

            <Field label="Vigente hasta" required error={errors.endDate}>
              <input
                type="date"
                value={state.endDate}
                onChange={e => setField('endDate', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Descripción" fullWidth>
            <textarea
              value={state.description}
              onChange={e => setField('description', e.target.value)}
              rows={3}
              placeholder="Detalles, condiciones de aplicación, restricciones…"
            />
          </Field>

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isCreate ? 'Crear campaña' : 'Guardar cambios'}
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
