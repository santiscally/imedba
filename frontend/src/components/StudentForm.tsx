import { useState, type FormEvent } from 'react'
import { X, Save, UserPlus } from 'lucide-react'
import type {
  Student,
  StudentCreateRequest,
  StudentUpdateRequest,
} from '../types/student'
import './StudentForm.scss'

type Payload = StudentCreateRequest | StudentUpdateRequest

interface Props {
  mode:      'create' | 'edit'
  initial?:  Student
  onClose:   () => void
  onSaved:   (saved: Student) => void
  onSubmit:  (payload: Payload) => Promise<Student>
}

// Estado interno — todos los campos como string para tratarlos de forma uniforme
// y convertirlos al tipo correcto antes del POST/PUT.
interface FormState {
  firstName:   string
  lastName:    string
  email:       string
  phone:       string
  dni:         string
  nationality: string
  university:  string
  locality:    string
  notes:       string
  active:      boolean
}

function initialState(s?: Student): FormState {
  return {
    firstName:   s?.firstName   ?? '',
    lastName:    s?.lastName    ?? '',
    email:       s?.email       ?? '',
    phone:       s?.phone       ?? '',
    dni:         s?.dni         ?? '',
    nationality: s?.nationality ?? '',
    university:  s?.university  ?? '',
    locality:    s?.locality    ?? '',
    notes:       s?.notes       ?? '',
    active:      s?.active ?? true,
  }
}

export default function StudentForm({ mode, initial, onClose, onSaved, onSubmit }: Props) {
  const [state,  setState]  = useState<FormState>(initialState(initial))
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!state.firstName.trim()) e.firstName = 'Obligatorio'
    if (!state.lastName.trim())  e.lastName  = 'Obligatorio'
    if (!state.email.trim())     e.email     = 'Obligatorio'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) e.email = 'Email inválido'
    if (state.firstName.length   > 100) e.firstName   = 'Máx 100 caracteres'
    if (state.lastName.length    > 100) e.lastName    = 'Máx 100 caracteres'
    if (state.email.length       > 255) e.email       = 'Máx 255 caracteres'
    if (state.phone.length       > 50)  e.phone       = 'Máx 50 caracteres'
    if (state.dni.length         > 20)  e.dni         = 'Máx 20 caracteres'
    if (state.nationality.length > 100) e.nationality = 'Máx 100 caracteres'
    if (state.university.length  > 200) e.university  = 'Máx 200 caracteres'
    if (state.locality.length    > 200) e.locality    = 'Máx 200 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const payload: Payload = {
      firstName:   state.firstName.trim(),
      lastName:    state.lastName.trim(),
      email:       state.email.trim(),
      phone:       state.phone.trim()       || null,
      dni:         state.dni.trim()         || null,
      nationality: state.nationality.trim() || null,
      university:  state.university.trim()  || null,
      locality:    state.locality.trim()    || null,
      notes:       state.notes.trim()       || null,
      active:      state.active,
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
  const Icon     = isCreate ? UserPlus : Save

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
              {isCreate ? 'Nuevo alumno' : 'Editar alumno'}
            </h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="form__grid">
            <Field label="Nombres" required error={errors.firstName}>
              <input
                type="text"
                value={state.firstName}
                onChange={e => setField('firstName', e.target.value)}
                maxLength={100}
                autoFocus
              />
            </Field>

            <Field label="Apellidos" required error={errors.lastName}>
              <input
                type="text"
                value={state.lastName}
                onChange={e => setField('lastName', e.target.value)}
                maxLength={100}
              />
            </Field>

            <Field label="Email" required error={errors.email}>
              <input
                type="email"
                value={state.email}
                onChange={e => setField('email', e.target.value)}
                maxLength={255}
              />
            </Field>

            <Field label="Celular / WhatsApp" error={errors.phone}>
              <input
                type="tel"
                value={state.phone}
                onChange={e => setField('phone', e.target.value)}
                maxLength={50}
                placeholder="+54 11 1234-5678"
              />
            </Field>

            <Field label="DNI" error={errors.dni}>
              <input
                type="text"
                value={state.dni}
                onChange={e => setField('dni', e.target.value)}
                maxLength={20}
              />
            </Field>

            <Field label="Nacionalidad" error={errors.nationality}>
              <input
                type="text"
                value={state.nationality}
                onChange={e => setField('nationality', e.target.value)}
                maxLength={100}
                placeholder="Argentina"
              />
            </Field>

            <Field label="Universidad" error={errors.university}>
              <input
                type="text"
                value={state.university}
                onChange={e => setField('university', e.target.value)}
                maxLength={200}
                placeholder="UBA, UNC, Favaloro, …"
              />
            </Field>

            <Field label="Localidad" error={errors.locality}>
              <input
                type="text"
                value={state.locality}
                onChange={e => setField('locality', e.target.value)}
                maxLength={200}
                placeholder="CABA, Rosario, …"
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

          <Field label="Observaciones" fullWidth>
            <textarea
              value={state.notes}
              onChange={e => setField('notes', e.target.value)}
              rows={3}
              placeholder="Notas internas de la vendedora…"
            />
          </Field>

          <p className="form__note">
            ⚠ Campos del Excel aún no modelados en el backend:{' '}
            <code>interview_status</code>, <code>Ausente plat NOV/ENE</code>,{' '}
            <code>Pago chq</code>. Se verán en el módulo Inscripciones o tras
            actualización del DDL.
          </p>

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isCreate ? 'Crear alumno' : 'Guardar cambios'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

// ─── Subcomponente Field ─────────────────────────────────────────────────────
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
