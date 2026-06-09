import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { X, Save, CreditCard, Filter, Layers } from 'lucide-react'
import type { Payment, PaymentCreateRequest } from '../types/payment'
import type { PaymentMethod } from '../types/enrollment'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../types/enrollment'
import type { Installment } from '../types/installment'
import { installmentLabel } from '../types/installment'
import { installmentsApi } from '../api/installments'
import { enrollmentsApi } from '../api/enrollments'
import './StudentForm.scss'

interface EnrInfo { studentName: string; courseName: string; courseCode: string | null }

// Datos estructurados de cada inscripción, para etiquetar y filtrar el select de cuotas.
interface EnrLabel { studentId: string; studentName: string; courseId: string; courseName: string }

interface Props {
  preselectInstallmentId?: string | null
  // Modo "pagar varias cuotas a la vez": se reciben las cuotas ya seleccionadas
  // (de una misma inscripción). El form crea un pago por cada una.
  batchInstallments?: Installment[]
  batchWho?: EnrInfo
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
  preselectInstallmentId, batchInstallments, batchWho, onClose, onSaved, onSubmit,
}: Props) {
  const isBatch = !!batchInstallments && batchInstallments.length > 0
  const batchTotal = useMemo(
    () => (batchInstallments ?? []).reduce((acc, i) => acc + i.totalDue, 0),
    [batchInstallments],
  )

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
  const [enrMap, setEnrMap] = useState<Map<string, EnrLabel>>(new Map())

  // Filtros opcionales del select de cuotas (solo modo simple).
  const [filterStudentId, setFilterStudentId] = useState('')
  const [filterCourseId,  setFilterCourseId]  = useState('')

  // Trae todas las cuotas no pagadas (PENDING + OVERDUE) para mostrar en el select.
  useEffect(() => {
    if (isBatch) { setLoadingPending(false); return }
    setLoadingPending(true)
    Promise.all([
      installmentsApi.list({ status: 'PENDING',  size: 200, sort: 'dueDate,asc' }),
      installmentsApi.list({ status: 'OVERDUE',  size: 200, sort: 'dueDate,asc' }),
    ])
      .then(([p, o]) => setPending([...o.content, ...p.content]))
      .catch(() => setPending([]))
      .finally(() => setLoadingPending(false))
  }, [isBatch])

  // Mapa enrollmentId → datos para etiquetar/filtrar las cuotas.
  useEffect(() => {
    enrollmentsApi.list({ size: 2000 })
      .then(res => {
        const m = new Map<string, EnrLabel>()
        for (const e of res.content) {
          m.set(e.id, {
            studentId:   e.student.id,
            studentName: `${e.student.lastName}, ${e.student.firstName}`,
            courseId:    e.course.id,
            courseName:  e.course.name,
          })
        }
        setEnrMap(m)
      })
      .catch(() => { /* sin nombres, mostramos solo cuota#/monto */ })
  }, [])

  // Si se preselecciona una cuota, autocompletar el monto con su totalDue.
  useEffect(() => {
    if (!preselectInstallmentId) return
    const found = pending.find(i => i.id === preselectInstallmentId)
    if (found) setState(s => ({ ...s, amount: String(found.totalDue) }))
  }, [preselectInstallmentId, pending])

  // Opciones de filtro: alumnos / cursos distintos presentes en las cuotas pendientes.
  const studentOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const i of pending) {
      const e = enrMap.get(i.enrollmentId)
      if (e && !seen.has(e.studentId)) seen.set(e.studentId, e.studentName)
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [pending, enrMap])

  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const i of pending) {
      const e = enrMap.get(i.enrollmentId)
      if (e && !seen.has(e.courseId)) seen.set(e.courseId, e.courseName)
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [pending, enrMap])

  // Cuotas visibles en el select tras aplicar filtros opcionales.
  const visiblePending = useMemo(() => pending.filter(i => {
    const e = enrMap.get(i.enrollmentId)
    if (filterStudentId && e?.studentId !== filterStudentId) return false
    if (filterCourseId  && e?.courseId  !== filterCourseId)  return false
    return true
  }), [pending, enrMap, filterStudentId, filterCourseId])

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
    if (!state.paymentMethod) e.paymentMethod = 'Obligatorio'
    if (!state.paymentDate)   e.paymentDate   = 'Obligatorio'

    if (!isBatch) {
      if (!state.amount) e.amount = 'Obligatorio'
      if (state.amount && Number.isNaN(Number(state.amount))) {
        e.amount = 'No es un número válido'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    // El backend espera Instant. Convertimos la fecha (YYYY-MM-DD) a medianoche UTC.
    const paymentDate = state.paymentDate ? `${state.paymentDate}T00:00:00Z` : null

    try {
      if (isBatch) {
        // Un pago por cuota seleccionada (cada uno con su propio recibo).
        let last: Payment | null = null
        for (const inst of batchInstallments!) {
          last = await onSubmit({
            installmentId: inst.id,
            amount:        inst.totalDue,
            paymentMethod: state.paymentMethod as PaymentMethod,
            paymentDate,
            notes:         state.notes.trim() || null,
          })
        }
        onSaved(last as Payment)
      } else {
        const saved = await onSubmit({
          installmentId: state.installmentId || null,
          amount:        Number(state.amount),
          paymentMethod: state.paymentMethod as PaymentMethod,
          paymentDate,
          notes:         state.notes.trim() || null,
        })
        onSaved(saved)
      }
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
            <h3 className="modal__title">
              {isBatch ? `Registrar pago de ${batchInstallments!.length} cuotas` : 'Registrar pago'}
            </h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          {isBatch ? (
            <div className="batch-summary">
              {batchWho && (
                <div className="batch-summary__who">
                  {batchWho.studentName} · {batchWho.courseName}
                </div>
              )}
              <ul className="batch-summary__list">
                {batchInstallments!.map(i => (
                  <li key={i.id} className="batch-summary__item">
                    <span className="batch-summary__label">{installmentLabel(i.number)}</span>
                    <span className="batch-summary__due">vence {i.dueDate}</span>
                    <span className="batch-summary__amount">{formatPrice(i.totalDue)}</span>
                  </li>
                ))}
              </ul>
              <div className="batch-summary__total">
                <span>Total</span>
                <strong>{formatPrice(batchTotal)}</strong>
              </div>
            </div>
          ) : (
            <>
              {/* Filtros opcionales para acotar la lista de cuotas */}
              <div className="form__filters">
                <Field label={<><Filter size={12} strokeWidth={2} /> Alumno (filtro)</>}>
                  <select
                    value={filterStudentId}
                    onChange={e => setFilterStudentId(e.target.value)}
                    disabled={loadingPending}
                  >
                    <option value="">Todos los alumnos</option>
                    {studentOptions.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </Field>
                <Field label={<><Layers size={12} strokeWidth={2} /> Curso (filtro)</>}>
                  <select
                    value={filterCourseId}
                    onChange={e => setFilterCourseId(e.target.value)}
                    disabled={loadingPending}
                  >
                    <option value="">Todos los cursos</option>
                    {courseOptions.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Cuota a saldar" error={errors.installmentId} fullWidth>
                <select
                  value={state.installmentId}
                  onChange={e => onSelectInstallment(e.target.value)}
                  disabled={loadingPending}
                  autoFocus
                >
                  <option value="">Pago suelto (sin cuota asignada)</option>
                  {visiblePending.map(i => {
                    const who = enrMap.get(i.enrollmentId)?.studentName ?? `Inscripción #${i.enrollmentId.slice(0, 8)}`
                    return (
                      <option key={i.id} value={i.id}>
                        {who} · {installmentLabel(i.number)} · vence {i.dueDate} · {formatPrice(i.totalDue)}
                        {i.status === 'OVERDUE' ? ' (VENCIDA)' : ''}
                      </option>
                    )
                  })}
                </select>
              </Field>
            </>
          )}

          <div className="form__grid">
            {!isBatch && (
              <Field label="Monto (ARS)" required error={errors.amount}>
                <input
                  type="number"
                  step="any"
                  value={state.amount}
                  onChange={e => setField('amount', e.target.value)}
                  placeholder="0"
                />
              </Field>
            )}

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
            {isBatch
              ? <>Se registrará <strong>un pago por cada cuota</strong> seleccionada con el mismo medio
                  y fecha. Cada una queda marcada como <strong>pagada</strong> y genera su propio recibo
                  (<code>IMD-YYYYMMDD-XXXXXX</code>).</>
              : <>El número de recibo (<code>IMD-YYYYMMDD-XXXXXX</code>) se genera automáticamente
                  al confirmar. Si seleccionás una cuota, queda marcada como <strong>pagada</strong>.</>}
          </p>

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={15} /> {saving
                ? 'Guardando…'
                : isBatch ? `Registrar ${batchInstallments!.length} pagos` : 'Registrar pago'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function Field(props: {
  label:      React.ReactNode
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
