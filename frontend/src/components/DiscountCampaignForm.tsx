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
  name:         string
  description:  string
  discountType: DiscountType
  value:        string
  validFrom:    string
  validTo:      string
  active:       boolean
}

function initialState(c?: DiscountCampaign): FormState {
  return {
    name:         c?.name         ?? '',
    description:  c?.description  ?? '',
    discountType: c?.discountType ?? 'PERCENTAGE',
    value:        c?.value != null ? String(c.value) : '',
    validFrom:    c?.validFrom    ?? '',
    validTo:      c?.validTo      ?? '',
    active:       c?.active ?? true,
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

    if (!state.value) {
      e.value = 'Obligatorio'
    } else {
      const n = Number(state.value)
      if (Number.isNaN(n) || n <= 0) {
        e.value = 'Debe ser un número mayor a 0'
      } else if (state.discountType === 'PERCENTAGE' && n > 100) {
        e.value = 'El porcentaje no puede superar 100'
      }
    }

    if (state.validFrom && !/^\d{4}-\d{2}-\d{2}$/.test(state.validFrom)) {
      e.validFrom = 'Formato YYYY-MM-DD'
    }
    if (state.validTo && !/^\d{4}-\d{2}-\d{2}$/.test(state.validTo)) {
      e.validTo = 'Formato YYYY-MM-DD'
    }
    if (state.validFrom && state.validTo && state.validFrom > state.validTo) {
      e.validTo = 'Debe ser posterior a "Vigente desde"'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const payload: Payload = {
      name:         state.name.trim(),
      description:  state.description.trim() || null,
      discountType: state.discountType,
      value:        Number(state.value),
      validFrom:    state.validFrom || null,
      validTo:      state.validTo   || null,
      active:       state.active,
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

            <Field label={valueLabel} required error={errors.value}>
              <input
                type="number"
                min="0"
                step={state.discountType === 'PERCENTAGE' ? '0.01' : 'any'}
                max={state.discountType === 'PERCENTAGE' ? '100' : undefined}
                value={state.value}
                onChange={e => setField('value', e.target.value)}
                placeholder={valuePlaceholder}
              />
            </Field>

            <Field label="Vigente desde" error={errors.validFrom}>
              <input
                type="date"
                value={state.validFrom}
                onChange={e => setField('validFrom', e.target.value)}
              />
            </Field>

            <Field label="Vigente hasta" error={errors.validTo}>
              <input
                type="date"
                value={state.validTo}
                onChange={e => setField('validTo', e.target.value)}
              />
            </Field>

            <Field label="Estado">
              <div className="toggle">
                <label className="toggle__option">
                  <input
                    type="radio"
                    checked={state.active}
                    onChange={() => setField('active', true)}
                  />
                  <span>Activa</span>
                </label>
                <label className="toggle__option">
                  <input
                    type="radio"
                    checked={!state.active}
                    onChange={() => setField('active', false)}
                  />
                  <span>Inactiva</span>
                </label>
              </div>
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
