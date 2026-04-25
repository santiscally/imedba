import { useEffect, useState, type FormEvent } from 'react'
import { X, Save, FilePlus2 } from 'lucide-react'
import type {
  Enrollment,
  EnrollmentCreateRequest,
  EnrollmentUpdateRequest,
  PaymentMethod,
} from '../types/enrollment'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../types/enrollment'
import type { Student } from '../types/student'
import type { Course } from '../types/course'
import { studentsApi } from '../api/students'
import { coursesApi } from '../api/courses'
import './StudentForm.scss'

type CreatePayload = EnrollmentCreateRequest
type UpdatePayload = EnrollmentUpdateRequest

interface Props {
  mode:     'create' | 'edit'
  initial?: Enrollment
  onClose:  () => void
  onSaved:  (saved: Enrollment) => void
  onSubmit: (payload: CreatePayload | UpdatePayload) => Promise<Enrollment>
}

interface FormState {
  studentId:          string
  courseId:           string
  listPrice:          string
  discountPercentage: string
  bookPrice:          string
  enrollmentFee:      string
  numInstallments:    string
  paymentMethod:      PaymentMethod | ''
  notes:              string
}

function initialState(e?: Enrollment): FormState {
  return {
    studentId:          e?.student.id ?? '',
    courseId:           e?.course.id  ?? '',
    listPrice:          e?.listPrice          != null ? String(e.listPrice)          : '',
    discountPercentage: e?.discountPercentage != null ? String(e.discountPercentage) : '',
    bookPrice:          e?.bookPrice          != null ? String(e.bookPrice)          : '',
    enrollmentFee:      e?.enrollmentFee      != null ? String(e.enrollmentFee)      : '',
    numInstallments:    e?.numInstallments    != null ? String(e.numInstallments)    : '',
    paymentMethod:      e?.paymentMethod      ?? '',
    notes:              e?.notes              ?? '',
  }
}

export default function EnrollmentForm({ mode, initial, onClose, onSaved, onSubmit }: Props) {
  const [state,       setState]       = useState<FormState>(initialState(initial))
  const [errors,      setErrors]      = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)

  const [students, setStudents] = useState<Student[]>([])
  const [courses,  setCourses]  = useState<Course[]>([])

  const isCreate = mode === 'create'

  // Carga sólo en create — en edit, student/course son inmutables y se muestran read-only.
  useEffect(() => {
    if (!isCreate) return
    Promise.all([
      studentsApi.list({ size: 200, sort: 'lastName,asc' }),
      coursesApi.list({ size: 200, sort: 'name,asc' }),
    ]).then(([studentsRes, coursesRes]) => {
      setStudents(studentsRes.content)
      setCourses(coursesRes.content)
    }).catch(() => { /* el form funciona igual aun si falla — los selects quedan vacíos */ })
  }, [isCreate])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (isCreate && !state.studentId) e.studentId = 'Obligatorio'
    if (isCreate && !state.courseId)  e.courseId  = 'Obligatorio'

    if (state.discountPercentage) {
      const n = Number(state.discountPercentage)
      if (Number.isNaN(n) || n < 0 || n > 100) e.discountPercentage = '0 – 100'
    }
    for (const k of ['listPrice','bookPrice','enrollmentFee'] as const) {
      if (state[k]) {
        const n = Number(state[k])
        if (Number.isNaN(n) || n < 0) e[k] = 'Debe ser ≥ 0'
      }
    }
    if (state.numInstallments) {
      const n = Number(state.numInstallments)
      if (!Number.isInteger(n) || n < 1) e.numInstallments = 'Entero ≥ 1'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const num = (v: string) => v ? Number(v) : null

    try {
      if (isCreate) {
        const payload: CreatePayload = {
          studentId:          state.studentId,
          courseId:           state.courseId,
          listPrice:          num(state.listPrice),
          discountPercentage: num(state.discountPercentage),
          bookPrice:          num(state.bookPrice),
          enrollmentFee:      num(state.enrollmentFee),
          numInstallments:    num(state.numInstallments),
          paymentMethod:      state.paymentMethod || null,
          notes:              state.notes.trim() || null,
        }
        const saved = await onSubmit(payload)
        onSaved(saved)
      } else {
        const payload: UpdatePayload = {
          listPrice:          num(state.listPrice),
          discountPercentage: num(state.discountPercentage),
          bookPrice:          num(state.bookPrice),
          enrollmentFee:      num(state.enrollmentFee),
          numInstallments:    num(state.numInstallments),
          paymentMethod:      state.paymentMethod || null,
          notes:              state.notes.trim() || null,
        }
        const saved = await onSubmit(payload)
        onSaved(saved)
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  const Icon = isCreate ? FilePlus2 : Save

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
              {isCreate ? 'Nueva inscripción' : 'Editar inscripción'}
            </h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="form__grid">
            <Field label="Alumno" required error={errors.studentId} fullWidth>
              {isCreate ? (
                <select
                  value={state.studentId}
                  onChange={e => setField('studentId', e.target.value)}
                  autoFocus
                >
                  <option value="">Seleccionar alumno…</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.lastName}, {s.firstName} — {s.email}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={`${initial!.student.lastName}, ${initial!.student.firstName}`}
                  disabled
                />
              )}
            </Field>

            <Field label="Curso" required error={errors.courseId} fullWidth>
              {isCreate ? (
                <select
                  value={state.courseId}
                  onChange={e => setField('courseId', e.target.value)}
                >
                  <option value="">Seleccionar curso…</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.code ? ` — ${c.code}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={`${initial!.course.name}${initial!.course.code ? ` — ${initial!.course.code}` : ''}`}
                  disabled
                />
              )}
            </Field>

            <Field label="Precio de lista (ARS)" error={errors.listPrice}>
              <input
                type="number"
                min="0"
                step="1000"
                value={state.listPrice}
                onChange={e => setField('listPrice', e.target.value)}
                placeholder="Si queda vacío, toma el del curso"
              />
            </Field>

            <Field label="Descuento (%)" error={errors.discountPercentage}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={state.discountPercentage}
                onChange={e => setField('discountPercentage', e.target.value)}
                placeholder="0"
              />
            </Field>

            <Field label="Libro (ARS)" error={errors.bookPrice}>
              <input
                type="number"
                min="0"
                step="1000"
                value={state.bookPrice}
                onChange={e => setField('bookPrice', e.target.value)}
                placeholder="0"
              />
            </Field>

            <Field label="Matrícula (ARS)" error={errors.enrollmentFee}>
              <input
                type="number"
                min="0"
                step="1000"
                value={state.enrollmentFee}
                onChange={e => setField('enrollmentFee', e.target.value)}
                placeholder="Si queda vacío, toma la del curso"
              />
            </Field>

            <Field label="Cantidad de cuotas" error={errors.numInstallments}>
              <input
                type="number"
                min="1"
                step="1"
                value={state.numInstallments}
                onChange={e => setField('numInstallments', e.target.value)}
                placeholder="1"
              />
            </Field>

            <Field label="Medio de pago">
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
          </div>

          <Field label="Observaciones" fullWidth>
            <textarea
              value={state.notes}
              onChange={e => setField('notes', e.target.value)}
              rows={3}
              placeholder="Notas internas de la vendedora…"
            />
          </Field>

          {isCreate && (
            <p className="form__note">
              Al crear una inscripción el backend genera automáticamente el
              cronograma de <code>installments</code> (cuotas). Este SPA sólo las consulta.
            </p>
          )}

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isCreate ? 'Crear inscripción' : 'Guardar cambios'}
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
