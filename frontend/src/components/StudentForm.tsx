import { useEffect, useState, type FormEvent } from 'react'
import { X, Save, UserPlus, Link2 } from 'lucide-react'
import type {
  Student,
  StudentCreateRequest,
  StudentUpdateRequest,
} from '../types/student'
import { toTitleCase } from '../lib/text'
import { moodleApi } from '../api/moodle'
import { hasAuthority } from '../lib/auth'
import './StudentForm.scss'

// Estado del chequeo "Validar con Moodle" (alta). idle → checking → found/notfound/error.
type MoodleCheck = {
  status:  'idle' | 'checking' | 'found' | 'notfound' | 'error'
  message: string
}

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
  }
}

export default function StudentForm({ mode, initial, onClose, onSaved, onSubmit }: Props) {
  const isCreate = mode === 'create'
  const Icon     = isCreate ? UserPlus : Save

  const [state,  setState]  = useState<FormState>(initialState(initial))
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Vínculo con Moodle al dar de alta. El botón "Validar con Moodle" valida el email
  // (sólo lectura): si existe, guarda el moodleUserId y se manda al crear; si no, avisa
  // pero deja crear igual (primero acá, después en Moodle).
  const canMoodle = hasAuthority('students:write')
  const [moodleEnabled, setMoodleEnabled] = useState(false)
  const [moodleUserId,  setMoodleUserId]  = useState<number | null>(initial?.moodleUserId ?? null)
  const [moodleCheck,   setMoodleCheck]   = useState<MoodleCheck>({ status: 'idle', message: '' })

  useEffect(() => {
    if (!isCreate || !canMoodle) return
    let alive = true
    moodleApi.status()
      .then(s => { if (alive) setMoodleEnabled(s.enabled) })
      .catch(() => { if (alive) setMoodleEnabled(false) })
    return () => { alive = false }
  }, [isCreate, canMoodle])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  // Al cambiar el email se invalida el chequeo previo (el moodleUserId ya no corresponde).
  function setEmail(value: string) {
    setField('email', value)
    if (moodleCheck.status !== 'idle' || moodleUserId != null) {
      setMoodleCheck({ status: 'idle', message: '' })
      setMoodleUserId(null)
    }
  }

  async function handleValidateMoodle() {
    const email = state.email.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Ingresá un email válido para validar' }))
      return
    }
    setMoodleCheck({ status: 'checking', message: '' })
    try {
      const r = await moodleApi.lookup(email)
      if (r.found && r.moodleUserId != null) {
        setMoodleUserId(r.moodleUserId)
        setMoodleCheck({ status: 'found', message: r.message })
      } else {
        setMoodleUserId(null)
        setMoodleCheck({ status: 'notfound', message: r.message })
      }
    } catch (e) {
      setMoodleUserId(null)
      setMoodleCheck({
        status: 'error',
        message: e instanceof Error ? e.message : 'No se pudo validar con Moodle',
      })
    }
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
    else if (state.phone.trim() && !/^[\d+\-()\s]+$/.test(state.phone.trim()))
      e.phone = 'Solo números (puede incluir + - ( ) y espacios)'
    if (state.dni.trim()) {
      const dniLen = state.dni.trim().length
      if (dniLen < 7 || dniLen > 11) e.dni = 'Debe tener entre 7 y 11 caracteres'
    }
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
      firstName:   toTitleCase(state.firstName.trim()),
      lastName:    toTitleCase(state.lastName.trim()),
      email:       state.email.trim(),
      phone:       state.phone.trim()       || null,
      dni:         state.dni.trim()         || null,
      nationality: state.nationality.trim() || null,
      university:  state.university.trim()  || null,
      locality:    state.locality.trim()    || null,
      notes:       state.notes.trim()       || null,
      // Sólo al crear: si se validó contra Moodle y existe, persiste el vínculo de una.
      ...(isCreate && moodleUserId != null ? { moodleUserId } : {}),
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
                onChange={e => setEmail(e.target.value)}
                maxLength={255}
              />
              {isCreate && canMoodle && moodleEnabled && (
                <div className="moodle-validate" style={{ marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                    onClick={handleValidateMoodle}
                    disabled={moodleCheck.status === 'checking'}
                  >
                    <Link2 size={14} />{' '}
                    {moodleCheck.status === 'checking' ? 'Validando…' : 'Validar con Moodle'}
                  </button>
                  {moodleCheck.message && (
                    <div
                      style={{
                        marginTop: '0.3rem',
                        fontSize: '0.8rem',
                        color:
                          moodleCheck.status === 'found' ? '#15803d'
                          : moodleCheck.status === 'error' ? '#b91c1c'
                          : '#b45309',
                      }}
                    >
                      {moodleCheck.status === 'found' ? '✓ '
                        : moodleCheck.status === 'notfound' ? '⚠ '
                        : ''}
                      {moodleCheck.message}
                    </div>
                  )}
                </div>
              )}
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
                inputMode="numeric"
                value={state.dni}
                onChange={e => setField('dni', e.target.value)}
                maxLength={11}
                placeholder="7 a 11 dígitos"
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
