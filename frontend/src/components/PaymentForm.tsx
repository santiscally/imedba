import { useEffect, useState, type FormEvent } from 'react'
import { X, Save, CreditCard } from 'lucide-react'
import type { Payment, PaymentCreateRequest } from '../types/payment'
import type { PaymentMethod } from '../types/enrollment'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../types/enrollment'
import type { Installment } from '../types/installment'
import { installmentsApi } from '../api/installments'
import './StudentForm.scss'

interface Props {
  preselectInstallmentId?: string | null
  onClose:  () => void
  onSaved:  (saved: Payment) => void
  onSubmit: (payload: PaymentCreateRequest) => Promise<Payment>
}

interface FormState {
  installmentId: string             // '' = pago suelto (matrícula u otro)
  amount:        string
  paymentMethod: PaymentMethod | ''
  paymentDate:   string             // YYYY-MM-DD
  notes:         string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function PaymentForm({
  preselectInstallmentId, onClose, onSaved, onSubmit,
}: Props) {
  const [state, setState] = useState<FormState>({
    installmentId: preselectInstallmentId ?? '',
    amount:        '',
    paymentMethod: '',
    paymentDate:   todayIso(),
    notes:         '',
  })
  const [errors,      setErrors]      = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)

  const [pending, setPending] = useState<Installment[]>([])
  const [loadingPending, setLoadingPending] = useState(true)

  // Trae todas las cuotas no pagadas (PENDING + OVERDUE) para mostrar en el select.
  useEffect(() => {
    setLoadingPending(true)
    Promise.all([
      installmentsApi.list({ status: 'PENDING',  size: 200, sort: 'dueDate,asc' }),
      installmentsApi.list({ status: 'OVERDUE',  size: 200, sort: 'dueDate,asc' }),
    ])
      .then(([p, o]) => setPending([...o.content, ...p.content]))
      .catch(() => setPending([]))
      .finally(() => setLoadingPending(false))
  }, [])

  // Si se preselecciona una cuota, autocompletar el monto con su totalDue.
  useEffect(() => {
    if (!preselectInstallmentId) return
    const found = pending.find(i => i.id === preselectInstallmentId)
    if (found) setState(s => ({ ...s, amount: String(found.totalDue) }))
  }, [preselectInstallmentId, pending])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function onSelectInstallment(id: string) {
    setField('installmentId', id)
    if (id) {
      const found = pending.find(i => i.id === id)
      if (found) setState(s => ({ ...s, installmentId: id, amount: String(found.totalDue) }))
    }
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!state.amount)        e.amount        = 'Obligatorio'
    if (!state.paymentMethod) e.paymentMethod = 'Obligatorio'
    if (!state.paymentDate)   e.paymentDate   = 'Obligatorio'

    if (state.amount) {
      const n = Number(state.amount)
      if (Number.isNaN(n) || n <= 0) e.amount = 'Debe ser un número mayor a 0'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const payload: PaymentCreateRequest = {
      installmentId: state.installmentId || null,
      amount:        Number(state.amount),
      paymentMethod: state.paymentMethod as PaymentMethod,
      paymentDate:   state.paymentDate,
      notes:         state.notes.trim() || null,
    }

    try {
      const saved = await onSubmit(payload)
      onSaved(saved)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al registrar pago')
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
            <div className="modal__title-icon"><CreditCard size={18} /></div>
            <h3 className="modal__title">Registrar pago</h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="form__grid">
            <Field label="Cuota a saldar" error={errors.installmentId} fullWidth>
              <select
                value={state.installmentId}
                onChange={e => onSelectInstallment(e.target.value)}
                disabled={loadingPending}
                autoFocus
              >
                <option value="">Pago suelto (sin cuota asignada)</option>
                {pending.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.enrollment.studentLastName}, {i.enrollment.studentFirstName} —{' '}
                    {i.enrollment.courseName} · cuota #{i.number} · vence {i.dueDate} ·{' '}
                    {formatPrice(i.totalDue)}
                    {i.status === 'OVERDUE' ? ' (VENCIDA)' : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Monto (ARS)" required error={errors.amount}>
              <input
                type="number"
                min="0"
                step="any"
                value={state.amount}
                onChange={e => setField('amount', e.target.value)}
                placeholder="0"
              />
            </Field>

            <Field label="Medio de pago" required error={errors.paymentMethod}>
              <select
                value={state.paymentMethod}
                onChange={e => setField('paymentMethod', e.target.value as PaymentMethod | '')}
              >
                <option value="">—</option>
                {PAYMENT_METHODS.map(pm => (
                  <option key={pm} value={pm}>{PAYMENT_METHOD_LABELS[pm]}</option>
                ))}
              </select>
            </Field>

            <Field label="Fecha de pago" required error={errors.paymentDate}>
              <input
                type="date"
                value={state.paymentDate}
                onChange={e => setField('paymentDate', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Observaciones" fullWidth>
            <textarea
              value={state.notes}
              onChange={e => setField('notes', e.target.value)}
              rows={3}
              placeholder="Notas internas del pago…"
            />
          </Field>

          <p className="form__note">
            El número de recibo (<code>IMD-YYYYMMDD-XXXXXX</code>) se genera automáticamente
            al confirmar. Si seleccionás una cuota, queda marcada como <strong>pagada</strong>.
          </p>

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={15} /> {saving ? 'Guardando…' : 'Registrar pago'}
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

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)
}
