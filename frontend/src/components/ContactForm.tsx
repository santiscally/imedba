import { useState, type FormEvent } from 'react'
import { X, Save, UserPlus2 } from 'lucide-react'
import type {
  Contact,
  ContactCreateRequest,
  ContactUpdateRequest,
  ContactType,
} from '../types/contact'
import { CONTACT_TYPES, CONTACT_TYPE_LABELS } from '../types/contact'
import './StudentForm.scss'

type Payload = ContactCreateRequest | ContactUpdateRequest

interface Props {
  mode:     'create' | 'edit'
  initial?: Contact
  onClose:  () => void
  onSaved:  (saved: Contact) => void
  onSubmit: (payload: Payload) => Promise<Contact>
}

interface FormState {
  contactType:      ContactType
  firstName:        string
  lastName:         string
  companyName:      string
  email:            string
  phone:            string
  roleDescription:  string
  notes:            string
}

function initialState(c?: Contact): FormState {
  return {
    contactType:     c?.contactType     ?? 'EMPLEADO',
    firstName:       c?.firstName       ?? '',
    lastName:        c?.lastName        ?? '',
    companyName:     c?.companyName     ?? '',
    email:           c?.email           ?? '',
    phone:           c?.phone           ?? '',
    roleDescription: c?.roleDescription ?? '',
    notes:           c?.notes           ?? '',
  }
}

export default function ContactForm({ mode, initial, onClose, onSaved, onSubmit }: Props) {
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

    // Validación cruzada según tipo (replica CHECK del backend)
    if (state.contactType === 'EMPLEADO') {
      if (!state.firstName.trim()) e.firstName = 'Obligatorio para empleados'
      if (!state.lastName.trim())  e.lastName  = 'Obligatorio para empleados'
    } else {
      if (!state.companyName.trim()) e.companyName = 'Obligatorio para proveedores'
    }

    if (state.firstName.length       > 100) e.firstName       = 'Máx 100 caracteres'
    if (state.lastName.length        > 100) e.lastName        = 'Máx 100 caracteres'
    if (state.companyName.length     > 200) e.companyName     = 'Máx 200 caracteres'
    if (state.phone.length           > 50)  e.phone           = 'Máx 50 caracteres'
    if (state.roleDescription.length > 200) e.roleDescription = 'Máx 200 caracteres'

    if (state.email) {
      if (state.email.length > 255)        e.email = 'Máx 255 caracteres'
      else if (!/^\S+@\S+\.\S+$/.test(state.email)) e.email = 'Email inválido'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const payload: Payload = {
      contactType:     state.contactType,
      firstName:       state.firstName.trim()       || null,
      lastName:        state.lastName.trim()        || null,
      companyName:     state.companyName.trim()     || null,
      email:           state.email.trim()           || null,
      phone:           state.phone.trim()           || null,
      roleDescription: state.roleDescription.trim() || null,
      notes:           state.notes.trim()           || null,
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
  const Icon     = isCreate ? UserPlus2 : Save
  const isEmpleado  = state.contactType === 'EMPLEADO'

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
              {isCreate ? 'Nuevo contacto' : 'Editar contacto'}
            </h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <Field label="Tipo de contacto" required>
            <div className="toggle">
              {CONTACT_TYPES.map(t => (
                <label key={t} className="toggle__option">
                  <input
                    type="radio"
                    checked={state.contactType === t}
                    onChange={() => setField('contactType', t)}
                  />
                  <span>{CONTACT_TYPE_LABELS[t]}</span>
                </label>
              ))}
            </div>
          </Field>

          {isEmpleado ? (
            <div className="form__grid">
              <Field label="Nombre" required error={errors.firstName}>
                <input
                  type="text"
                  value={state.firstName}
                  onChange={e => setField('firstName', e.target.value)}
                  maxLength={100}
                  autoFocus
                  placeholder="Carolina"
                />
              </Field>
              <Field label="Apellido" required error={errors.lastName}>
                <input
                  type="text"
                  value={state.lastName}
                  onChange={e => setField('lastName', e.target.value)}
                  maxLength={100}
                  placeholder="Sosa"
                />
              </Field>
            </div>
          ) : (
            <Field label="Razón social" required error={errors.companyName} fullWidth>
              <input
                type="text"
                value={state.companyName}
                onChange={e => setField('companyName', e.target.value)}
                maxLength={200}
                autoFocus
                placeholder="Imprenta Trama S.A."
              />
            </Field>
          )}

          <div className="form__grid">
            <Field label="Email" error={errors.email}>
              <input
                type="email"
                value={state.email}
                onChange={e => setField('email', e.target.value)}
                maxLength={255}
                placeholder="contacto@dominio.com"
              />
            </Field>
            <Field label="Teléfono" error={errors.phone}>
              <input
                type="tel"
                value={state.phone}
                onChange={e => setField('phone', e.target.value)}
                maxLength={50}
                placeholder="+54 9 351 1234567"
              />
            </Field>
            <Field label={isEmpleado ? 'Rol / cargo' : 'Servicio'} error={errors.roleDescription} fullWidth>
              <input
                type="text"
                value={state.roleDescription}
                onChange={e => setField('roleDescription', e.target.value)}
                maxLength={200}
                placeholder={isEmpleado ? 'Secretaria académica' : 'Imprenta — tirada de libros'}
              />
            </Field>
          </div>

          <Field label="Notas" fullWidth>
            <textarea
              value={state.notes}
              onChange={e => setField('notes', e.target.value)}
              rows={3}
              placeholder="Detalles, observaciones internas, condiciones…"
            />
          </Field>

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isCreate ? 'Crear contacto' : 'Guardar cambios'}
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
