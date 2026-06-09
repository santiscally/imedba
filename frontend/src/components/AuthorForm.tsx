import { useState, type FormEvent } from 'react'
import { X, Save, PenTool } from 'lucide-react'
import type { Author, AuthorCreateRequest, AuthorUpdateRequest } from '../types/author'
import { toTitleCase } from '../lib/text'
import './StudentForm.scss'

type Payload = AuthorCreateRequest | AuthorUpdateRequest

interface Props {
  mode:     'create' | 'edit'
  initial?: Author
  onClose:  () => void
  onSaved:  (saved: Author) => void
  onSubmit: (payload: Payload) => Promise<Author>
}

interface FormState {
  firstName: string
  lastName:  string
  email:     string
  phone:     string
}

function initialState(a?: Author): FormState {
  return {
    firstName: a?.firstName ?? '',
    lastName:  a?.lastName  ?? '',
    email:     a?.email     ?? '',
    phone:     a?.phone     ?? '',
  }
}

export default function AuthorForm({ mode, initial, onClose, onSaved, onSubmit }: Props) {
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
    if (!state.firstName.trim()) e.firstName = 'Obligatorio'
    if (!state.lastName.trim())  e.lastName  = 'Obligatorio'
    if (state.firstName.length > 100) e.firstName = 'Máx 100 caracteres'
    if (state.lastName.length  > 100) e.lastName  = 'Máx 100 caracteres'
    if (state.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) {
      e.email = 'Email inválido'
    }
    if (state.email.length > 255) e.email = 'Máx 255 caracteres'
    if (state.phone.length > 50)  e.phone = 'Máx 50 caracteres'
    if (state.phone.trim() && !/^[\d+\-()\s]+$/.test(state.phone.trim())) {
      e.phone = 'Solo números (puede incluir + - ( ) y espacios)'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const payload: Payload = {
      firstName: toTitleCase(state.firstName.trim()),
      lastName:  toTitleCase(state.lastName.trim()),
      email:     state.email.trim() || null,
      phone:     state.phone.trim() || null,
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
  const Icon     = isCreate ? PenTool : Save

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={ev => ev.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><Icon size={18} /></div>
            <h3 className="modal__title">{isCreate ? 'Nuevo autor' : 'Editar autor'}</h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="form__grid">
            <Field label="Nombres" required error={errors.firstName}>
              <input type="text" value={state.firstName} maxLength={100} autoFocus
                onChange={e => setField('firstName', e.target.value)} />
            </Field>
            <Field label="Apellidos" required error={errors.lastName}>
              <input type="text" value={state.lastName} maxLength={100}
                onChange={e => setField('lastName', e.target.value)} />
            </Field>
            <Field label="Email" error={errors.email}>
              <input type="email" value={state.email} maxLength={255}
                onChange={e => setField('email', e.target.value)} />
            </Field>
            <Field label="Celular" error={errors.phone}>
              <input type="tel" value={state.phone} maxLength={50} placeholder="+54 11 1234-5678"
                onChange={e => setField('phone', e.target.value)} />
            </Field>

          </div>

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isCreate ? 'Crear autor' : 'Guardar cambios'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function Field(props: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className={`field ${props.error ? 'field--error' : ''}`}>
      <label className="field__label">
        {props.label}{props.required && <span className="field__required">*</span>}
      </label>
      {props.children}
      {props.error && <div className="field__error">{props.error}</div>}
    </div>
  )
}
