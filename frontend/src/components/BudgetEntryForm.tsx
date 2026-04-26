import { useState, type FormEvent } from 'react'
import { X, Save, FilePlus2 } from 'lucide-react'
import type {
  BudgetEntry,
  BudgetEntryCreateRequest,
  EntryType,
  BudgetCategory,
  BudgetBusinessUnit,
} from '../types/budget'
import {
  ENTRY_TYPES, ENTRY_TYPE_LABELS,
  BUDGET_CATEGORIES, BUDGET_CATEGORY_LABELS,
  BUDGET_BUSINESS_UNITS, BUDGET_BUSINESS_UNIT_LABELS,
} from '../types/budget'
import type { PaymentMethod } from '../types/enrollment'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../types/enrollment'
import './StudentForm.scss'

interface Props {
  onClose:  () => void
  onSaved:  (saved: BudgetEntry) => void
  onSubmit: (payload: BudgetEntryCreateRequest) => Promise<BudgetEntry>
}

interface FormState {
  entryType:        EntryType
  category:         BudgetCategory
  subcategory:      string
  businessUnit:     BudgetBusinessUnit | ''
  concept:          string
  amount:           string
  entryDate:        string
  paymentMethod:    PaymentMethod | ''
  projected:        boolean
  recurring:        boolean
  cash:             boolean
  referenceNumber:  string
  notes:            string
}

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function initialState(): FormState {
  return {
    entryType:       'EXPENSE',
    category:        'FIXED',
    subcategory:     '',
    businessUnit:    'GENERAL',
    concept:         '',
    amount:          '',
    entryDate:       todayLocal(),
    paymentMethod:   '',
    projected:       false,
    recurring:       false,
    cash:            false,
    referenceNumber: '',
    notes:           '',
  }
}

export default function BudgetEntryForm({ onClose, onSaved, onSubmit }: Props) {
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
    if (!state.concept.trim())     e.concept = 'Obligatorio'
    if (state.concept.length > 300) e.concept = 'Máx 300 caracteres'
    if (state.subcategory.length > 100) e.subcategory = 'Máx 100 caracteres'
    if (state.referenceNumber.length > 200) e.referenceNumber = 'Máx 200 caracteres'

    if (!state.amount) {
      e.amount = 'Obligatorio'
    } else {
      const n = Number(state.amount)
      if (Number.isNaN(n) || n < 0) e.amount = 'Debe ser ≥ 0'
    }

    if (!state.entryDate || !/^\d{4}-\d{2}-\d{2}$/.test(state.entryDate)) {
      e.entryDate = 'Formato YYYY-MM-DD'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const payload: BudgetEntryCreateRequest = {
      entryType:        state.entryType,
      category:         state.category,
      subcategory:      state.subcategory.trim() || null,
      businessUnit:     state.businessUnit || null,
      concept:          state.concept.trim(),
      amount:           Number(state.amount),
      entryDate:        state.entryDate,
      paymentMethod:    state.paymentMethod || null,
      projected:        state.projected,
      recurring:        state.recurring,
      cash:             state.cash,
      referenceNumber:  state.referenceNumber.trim() || null,
      notes:            state.notes.trim() || null,
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
            <div className="modal__title-icon"><FilePlus2 size={18} /></div>
            <h3 className="modal__title">Nuevo movimiento</h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="form__grid">
            <Field label="Tipo" required>
              <select
                value={state.entryType}
                onChange={e => setField('entryType', e.target.value as EntryType)}
              >
                {ENTRY_TYPES.map(t => (
                  <option key={t} value={t}>{ENTRY_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </Field>

            <Field label="Categoría" required>
              <select
                value={state.category}
                onChange={e => setField('category', e.target.value as BudgetCategory)}
              >
                {BUDGET_CATEGORIES.map(c => (
                  <option key={c} value={c}>{BUDGET_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </Field>

            <Field label="Unidad de negocio">
              <select
                value={state.businessUnit}
                onChange={e => setField('businessUnit', e.target.value as BudgetBusinessUnit | '')}
              >
                <option value="">— Sin asignar —</option>
                {BUDGET_BUSINESS_UNITS.map(bu => (
                  <option key={bu} value={bu}>{BUDGET_BUSINESS_UNIT_LABELS[bu]}</option>
                ))}
              </select>
            </Field>

            <Field label="Subcategoría" error={errors.subcategory}>
              <input
                type="text"
                value={state.subcategory}
                onChange={e => setField('subcategory', e.target.value)}
                maxLength={100}
                placeholder="Servicios públicos, Honorarios, …"
              />
            </Field>

            <Field label="Concepto" required error={errors.concept} fullWidth>
              <input
                type="text"
                value={state.concept}
                onChange={e => setField('concept', e.target.value)}
                maxLength={300}
                autoFocus
                placeholder="Alquiler oficina abril"
              />
            </Field>

            <Field label="Monto (ARS)" required error={errors.amount}>
              <input
                type="number" min="0" step="any"
                value={state.amount}
                onChange={e => setField('amount', e.target.value)}
                placeholder="780000"
              />
            </Field>

            <Field label="Fecha" required error={errors.entryDate}>
              <input
                type="date"
                value={state.entryDate}
                onChange={e => setField('entryDate', e.target.value)}
              />
            </Field>

            <Field label="Método de pago">
              <select
                value={state.paymentMethod}
                onChange={e => setField('paymentMethod', e.target.value as PaymentMethod | '')}
              >
                <option value="">— Sin asignar —</option>
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </Field>

            <Field label="N° referencia" error={errors.referenceNumber}>
              <input
                type="text"
                value={state.referenceNumber}
                onChange={e => setField('referenceNumber', e.target.value)}
                maxLength={200}
                placeholder="FAC-001234"
              />
            </Field>

            <Field label="Flags" fullWidth>
              <div className="checkbox-row">
                <label className="checkbox-row__opt">
                  <input
                    type="checkbox"
                    checked={state.projected}
                    onChange={e => setField('projected', e.target.checked)}
                  />
                  <span>Proyectado (no real)</span>
                </label>
                <label className="checkbox-row__opt">
                  <input
                    type="checkbox"
                    checked={state.recurring}
                    onChange={e => setField('recurring', e.target.checked)}
                  />
                  <span>Recurrente</span>
                </label>
                <label className="checkbox-row__opt">
                  <input
                    type="checkbox"
                    checked={state.cash}
                    onChange={e => setField('cash', e.target.checked)}
                  />
                  <span>Movimiento en efectivo</span>
                </label>
              </div>
            </Field>
          </div>

          <Field label="Notas" fullWidth>
            <textarea
              value={state.notes}
              onChange={e => setField('notes', e.target.value)}
              rows={3}
              placeholder="Detalles adicionales…"
            />
          </Field>

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : <><Save size={15} /> Registrar movimiento</>}
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
