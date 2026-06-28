import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X, Save, TrendingUp, TrendingDown } from 'lucide-react'
import type {
  BudgetEntry,
  BudgetEntryCreateRequest,
  EntryType,
  BudgetCategory,
  BudgetBusinessUnit,
} from '../types/budget'
import {
  BUDGET_CATEGORY_LABELS, INCOME_CATEGORIES, EXPENSE_CATEGORIES,
  BUDGET_BUSINESS_UNITS, BUDGET_BUSINESS_UNIT_LABELS,
} from '../types/budget'
import type { PaymentMethod } from '../types/enrollment'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../types/enrollment'
import { budgetApi } from '../api/budget'
import './StudentForm.scss'
import './BudgetEntryForm.scss'

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

  // Autocomplete del campo "Concepto": conceptos ya usados en esta categoría
  // se ofrecen como sugerencias para evitar typos ("Sueldo PAULA" vs "Pago paula erlich").
  // Cacheado por categoría — no re-fetch si el user vuelve a la misma.
  const [pastConcepts, setPastConcepts] = useState<string[]>([])
  const conceptCache = useRef<Map<BudgetCategory, string[]>>(new Map())

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  // El catálogo de categorías depende del tipo de movimiento (ingreso/egreso).
  const categoryList = state.entryType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  function onEntryTypeChange(t: EntryType) {
    const list = t === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    setState(prev => ({ ...prev, entryType: t, category: list[0] }))
  }

  // Cuando cambia la categoría, traigo los últimos N entries y extraigo conceptos
  // distintos (server-side filter por category, client-side dedup).
  useEffect(() => {
    const cached = conceptCache.current.get(state.category)
    if (cached) { setPastConcepts(cached); return }

    let cancelled = false
    budgetApi.listEntries({ category: state.category, size: 200, sort: 'entryDate,desc' })
      .then(res => {
        if (cancelled) return
        const seen = new Set<string>()
        const concepts: string[] = []
        for (const e of res.content) {
          const c = e.concept.trim()
          if (c && !seen.has(c.toLowerCase())) {
            seen.add(c.toLowerCase())
            concepts.push(c)
          }
        }
        conceptCache.current.set(state.category, concepts)
        setPastConcepts(concepts)
      })
      .catch(() => { /* el autocomplete es best-effort; si falla, el input sigue funcionando */ })

    return () => { cancelled = true }
  }, [state.category])

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!state.concept.trim())     e.concept = 'Obligatorio'
    if (state.concept.length > 300) e.concept = 'Máx 300 caracteres'
    if (state.subcategory.length > 100) e.subcategory = 'Máx 100 caracteres'
    if (state.referenceNumber.length > 200) e.referenceNumber = 'Máx 200 caracteres'

    if (!state.amount) {
      e.amount = 'Obligatorio'
    } else if (Number.isNaN(Number(state.amount))) {
      e.amount = 'No es un número válido'
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

  const isIncome = state.entryType === 'INCOME'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal budget-form budget-form--${isIncome ? 'income' : 'expense'}`}
        onClick={ev => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="modal__header budget-form__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon">
              {isIncome ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>
            <h3 className="modal__title">
              {isIncome ? 'Nuevo ingreso' : 'Nuevo egreso'}
            </h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          {/* Toggle grande INGRESO / EGRESO — primer cosa que ve el usuario. */}
          <div className="budget-form__type-toggle" role="tablist" aria-label="Tipo de movimiento">
            <button
              type="button"
              role="tab"
              aria-selected={isIncome}
              className={`type-btn type-btn--income ${isIncome ? 'type-btn--active' : ''}`}
              onClick={() => onEntryTypeChange('INCOME')}
            >
              <TrendingUp size={22} strokeWidth={2} />
              <div className="type-btn__text">
                <span className="type-btn__title">INGRESO</span>
                <span className="type-btn__sub">Entra plata</span>
              </div>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isIncome}
              className={`type-btn type-btn--expense ${!isIncome ? 'type-btn--active' : ''}`}
              onClick={() => onEntryTypeChange('EXPENSE')}
            >
              <TrendingDown size={22} strokeWidth={2} />
              <div className="type-btn__text">
                <span className="type-btn__title">EGRESO</span>
                <span className="type-btn__sub">Sale plata</span>
              </div>
            </button>
          </div>

          <div className="form__grid">
            <Field label="Categoría" required fullWidth>
              <select
                value={state.category}
                onChange={e => setField('category', e.target.value as BudgetCategory)}
              >
                {categoryList.map(c => (
                  <option key={c} value={c}>{BUDGET_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </Field>

            <Field label="Concepto" required error={errors.concept} fullWidth>
              <input
                type="text"
                value={state.concept}
                onChange={e => setField('concept', e.target.value)}
                maxLength={300}
                autoFocus
                placeholder={isIncome ? 'Donación, curso particular, convenio…' : 'Alquiler oficina junio, sueldo Marcela…'}
                list="budget-concept-suggestions"
                autoComplete="off"
              />
              <datalist id="budget-concept-suggestions">
                {pastConcepts.map(c => <option key={c} value={c} />)}
              </datalist>
              {pastConcepts.length > 0 && (
                <small className="field__hint">
                  💡 Hay {pastConcepts.length} concepto{pastConcepts.length === 1 ? '' : 's'} previo{pastConcepts.length === 1 ? '' : 's'} en esta categoría — empezá a escribir para autocompletar.
                </small>
              )}
            </Field>

            <Field label={isIncome ? 'Monto a cobrar (ARS)' : 'Monto a pagar (ARS)'} required error={errors.amount}>
              <input
                type="number" step="any"
                value={state.amount}
                onChange={e => setField('amount', e.target.value)}
                placeholder="780000"
              />
            </Field>

            <Field label="Subcategoría" error={errors.subcategory}>
              <input
                type="text"
                value={state.subcategory}
                onChange={e => setField('subcategory', e.target.value)}
                maxLength={100}
                placeholder={isIncome ? 'Convenio, donación…' : 'Sueldos, alquiler, impuestos…'}
              />
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
            <button type="submit" className={`btn-primary btn-primary--${isIncome ? 'income' : 'expense'}`} disabled={saving}>
              {saving ? 'Guardando…' : (
                <>
                  <Save size={15} /> {isIncome ? 'Registrar ingreso' : 'Registrar egreso'}
                </>
              )}
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
