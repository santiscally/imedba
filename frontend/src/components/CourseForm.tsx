import { useState, type FormEvent } from 'react'
import { X, Save, BookPlus } from 'lucide-react'
import type {
  Course,
  CourseCreateRequest,
  CourseUpdateRequest,
  BusinessUnit,
} from '../types/course'
import { BUSINESS_UNITS, BUSINESS_UNIT_LABELS, MODALITIES_SUGERIDAS } from '../types/course'
import './StudentForm.scss'

type Payload = CourseCreateRequest | CourseUpdateRequest

interface Props {
  mode:     'create' | 'edit'
  initial?: Course
  onClose:  () => void
  onSaved:  (saved: Course) => void
  onSubmit: (payload: Payload) => Promise<Course>
}

interface FormState {
  name:            string
  code:            string
  description:     string
  businessUnit:    BusinessUnit
  modality:        string
  enrollmentPrice: string
  coursePrice:     string
  examDate:        string
  active:          boolean
}

function initialState(c?: Course): FormState {
  return {
    name:            c?.name            ?? '',
    code:            c?.code            ?? '',
    description:     c?.description     ?? '',
    businessUnit:    c?.businessUnit    ?? 'RESIDENCIAS',
    modality:        c?.modality        ?? '',
    enrollmentPrice: c?.enrollmentPrice != null ? String(c.enrollmentPrice) : '',
    coursePrice:     c?.coursePrice     != null ? String(c.coursePrice)     : '',
    examDate:        c?.examDate        ?? '',
    active:          c?.active ?? true,
  }
}

export default function CourseForm({ mode, initial, onClose, onSaved, onSubmit }: Props) {
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
    if (!state.name.trim())          e.name         = 'Obligatorio'
    if (!state.businessUnit)         e.businessUnit = 'Obligatorio'
    if (state.name.length     > 200) e.name         = 'Máx 200 caracteres'
    if (state.code.length     > 50)  e.code         = 'Máx 50 caracteres'
    if (state.modality.length > 50)  e.modality     = 'Máx 50 caracteres'

    if (state.enrollmentPrice) {
      const n = Number(state.enrollmentPrice)
      if (Number.isNaN(n) || n <= 0) e.enrollmentPrice = 'Debe ser un número mayor a 0'
    }
    if (state.coursePrice) {
      const n = Number(state.coursePrice)
      if (Number.isNaN(n) || n <= 0) e.coursePrice = 'Debe ser un número mayor a 0'
    }
    if (state.examDate && !/^\d{4}-\d{2}-\d{2}$/.test(state.examDate)) {
      e.examDate = 'Formato YYYY-MM-DD'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const payload: Payload = {
      name:            state.name.trim(),
      code:            state.code.trim()        || null,
      description:     state.description.trim() || null,
      businessUnit:    state.businessUnit,
      modality:        state.modality.trim()    || null,
      enrollmentPrice: state.enrollmentPrice    ? Number(state.enrollmentPrice) : null,
      coursePrice:     state.coursePrice        ? Number(state.coursePrice)     : null,
      examDate:        state.examDate           || null,
      active:          state.active,
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
  const Icon     = isCreate ? BookPlus : Save

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
              {isCreate ? 'Nuevo curso' : 'Editar curso'}
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
                placeholder="Curso Intensivo Libre 2026"
              />
            </Field>

            <Field label="Código" error={errors.code}>
              <input
                type="text"
                value={state.code}
                onChange={e => setField('code', e.target.value)}
                maxLength={50}
                placeholder="RMA-INT-L-2026"
              />
            </Field>

            <Field label="Unidad de negocio" required error={errors.businessUnit}>
              <select
                value={state.businessUnit}
                onChange={e => setField('businessUnit', e.target.value as BusinessUnit)}
              >
                {BUSINESS_UNITS.map(bu => (
                  <option key={bu} value={bu}>{BUSINESS_UNIT_LABELS[bu]}</option>
                ))}
              </select>
            </Field>

            <Field label="Modalidad" error={errors.modality}>
              <input
                type="text"
                value={state.modality}
                onChange={e => setField('modality', e.target.value)}
                maxLength={50}
                list="modalidades-sugeridas"
                placeholder="INTENSIVO, LIBRE, VIVO, …"
              />
              <datalist id="modalidades-sugeridas">
                {MODALITIES_SUGERIDAS.map(m => <option key={m} value={m} />)}
              </datalist>
            </Field>

            <Field label="Fecha de examen" error={errors.examDate}>
              <input
                type="date"
                value={state.examDate}
                onChange={e => setField('examDate', e.target.value)}
              />
            </Field>

            <Field label="Precio matrícula (ARS)" error={errors.enrollmentPrice}>
              <input
                type="number"
                min="0"
                step="any"
                value={state.enrollmentPrice}
                onChange={e => setField('enrollmentPrice', e.target.value)}
                placeholder="120000"
              />
            </Field>

            <Field label="Precio curso (ARS)" error={errors.coursePrice}>
              <input
                type="number"
                min="0"
                step="any"
                value={state.coursePrice}
                onChange={e => setField('coursePrice', e.target.value)}
                placeholder="1020000"
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
                  <span>Activo</span>
                </label>
                <label className="toggle__option">
                  <input
                    type="radio"
                    checked={!state.active}
                    onChange={() => setField('active', false)}
                  />
                  <span>Inactivo</span>
                </label>
              </div>
            </Field>
          </div>

          <Field label="Descripción" fullWidth>
            <textarea
              value={state.description}
              onChange={e => setField('description', e.target.value)}
              rows={3}
              placeholder="Descripción breve del curso…"
            />
          </Field>

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isCreate ? 'Crear curso' : 'Guardar cambios'}
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
