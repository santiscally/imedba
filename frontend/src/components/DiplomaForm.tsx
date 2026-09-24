import { useEffect, useState, type FormEvent } from 'react'
import { X, Save, GraduationCap, UserPlus } from 'lucide-react'
import type {
  Diploma,
  DiplomaCreateRequest,
  DiplomaUpdateRequest,
} from '../types/diploma'
import type { Staff } from '../types/staff'
import { staffApi } from '../api/staff'
import { CommissionFields } from './CommissionForm'
import {
  commissionPayload, commissionState, validateCommission,
  type CommissionErrors, type CommissionState,
} from '../lib/commission'
import './StudentForm.scss'
import './DiplomaForm.scss'

type Payload = DiplomaCreateRequest | DiplomaUpdateRequest

interface Props {
  mode:     'create' | 'edit'
  initial?: Diploma
  onClose:  () => void
  onSaved:  (saved: Diploma) => void
  onSubmit: (payload: Payload) => Promise<Diploma>
}

// Diplomatura general + directoras; precios, libro y fechas van por comisión (docx 2026-09-24).
interface FormState {
  name:            string
  universityName:  string
  description:     string
  directorIds:     string[]
}

function initialState(d?: Diploma): FormState {
  return {
    name:            d?.name            ?? '',
    universityName:  d?.universityName  ?? '',
    description:     d?.description     ?? '',
    directorIds:     d?.directors?.map(x => x.id) ?? [],
  }
}

type FieldErrors = Partial<Record<keyof FormState, string>>

export default function DiplomaForm({ mode, initial, onClose, onSaved, onSubmit }: Props) {
  const [state,       setState]       = useState<FormState>(initialState(initial))
  const [errors,      setErrors]      = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [commission,  setCommission]  = useState<CommissionState>(commissionState())
  const [comErrors,   setComErrors]   = useState<CommissionErrors>({})
  const isCreate = mode === 'create'
  // Directoras disponibles: Personal Académico con rol DIRECTORA (V034/V035).
  const [availableDirectors, setAvailableDirectors] = useState<Staff[] | null>(null)

  useEffect(() => {
    staffApi.listActiveByType('DIRECTORA')
      .then(setAvailableDirectors)
      .catch(() => setAvailableDirectors([]))
  }, [])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function setCommissionField<K extends keyof CommissionState>(key: K, value: CommissionState[K]) {
    setCommission(prev => ({ ...prev, [key]: value }))
    if (comErrors[key]) setComErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function toggleDirector(id: string) {
    setState(prev => ({
      ...prev,
      directorIds: prev.directorIds.includes(id)
        ? prev.directorIds.filter(x => x !== id)
        : [...prev.directorIds, id],
    }))
  }

  function validate(): boolean {
    const e: FieldErrors = {}
    if (!state.name.trim())                e.name = 'Obligatorio'
    if (state.name.length > 300)           e.name = 'Máx 300 caracteres'
    if (state.universityName.length > 200) e.universityName = 'Máx 200 caracteres'
    const ce = isCreate ? validateCommission(commission) : {}

    setErrors(e)
    setComErrors(ce)
    return Object.keys(e).length === 0 && Object.keys(ce).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const payload: Payload = {
      name:            state.name.trim(),
      universityName:  state.universityName.trim() || null,
      description:     state.description.trim()    || null,
      // Siempre se manda la lista (aunque esté vacía): en update, null significaría
      // "no tocar" y no habría forma de sacar a todas las directoras.
      directorIds:     state.directorIds,
      ...(isCreate ? { firstCommission: commissionPayload(commission) } : {}),
    }

    try {
      const saved = await onSubmit(payload)
      onSaved(saved)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  const Icon     = isCreate ? GraduationCap : Save

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal--lg"
        onClick={ev => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><Icon size={18} /></div>
            <h3 className="modal__title">
              {isCreate ? 'Nueva diplomatura' : 'Editar diplomatura'}
            </h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <h4 className="form-section">Identificación</h4>
          <div className="form__grid">
            <Field label="Nombre" required error={errors.name} fullWidth>
              <input
                type="text"
                value={state.name}
                onChange={e => setField('name', e.target.value)}
                maxLength={300}
                autoFocus
                placeholder="Diplomatura en Cardiología Pediátrica"
              />
            </Field>

            <Field label="Universidad" error={errors.universityName} fullWidth>
              <input
                type="text"
                value={state.universityName}
                onChange={e => setField('universityName', e.target.value)}
                maxLength={200}
                placeholder="Universidad Nacional de Rosario"
              />
            </Field>

          </div>

          <div className="form__hint">
            Es la diplomatura <strong>general</strong>. Cada comisión tiene su matrícula, precio,
            libro y fechas, y es a lo que se inscriben los alumnos. Las comisiones siguientes se
            agregan desde el detalle de la diplomatura.
          </div>

          {isCreate && (
            <>
              <h4 className="form-section">Primera comisión</h4>
              <CommissionFields state={commission} errors={comErrors} onChange={setCommissionField} />
            </>
          )}

          <div className="partners">
            <div className="partners__header">
              <h4 className="form-section partners__title">
                Directoras
                <span className="form-section__hint">
                  {state.directorIds.length === 0
                    ? 'Ninguna seleccionada'
                    : `${state.directorIds.length} seleccionada${state.directorIds.length === 1 ? '' : 's'} — reparten en partes iguales`}
                </span>
              </h4>
            </div>

            {availableDirectors === null && (
              <div className="partners__empty">Cargando…</div>
            )}

            {availableDirectors?.length === 0 && (
              <div className="partners__empty">
                No hay nadie cargado como <strong>Directora</strong> en Personal Académico.
                Cargala primero desde Académico → Personal Académico y volvé acá.
              </div>
            )}

            {availableDirectors && availableDirectors.length > 0 && (
              <div className="director-picker">
                {availableDirectors.map(d => (
                  <label key={d.id} className="director-picker__item">
                    <input
                      type="checkbox"
                      checked={state.directorIds.includes(d.id)}
                      onChange={() => toggleDirector(d.id)}
                    />
                    <span className="director-picker__name">
                      <UserPlus size={13} strokeWidth={1.8} />
                      {d.lastName}, {d.firstName}
                    </span>
                    {d.email && <span className="director-picker__email">{d.email}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          <h4 className="form-section">Descripción</h4>
          <Field label="Descripción" fullWidth>
            <textarea
              value={state.description}
              onChange={e => setField('description', e.target.value)}
              rows={3}
              placeholder="Descripción breve, duración, modalidad…"
            />
          </Field>

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isCreate ? 'Crear diplomatura' : 'Guardar cambios'}
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
  className?: string
  children:   React.ReactNode
}) {
  const cls = [
    'field',
    props.fullWidth ? 'field--full' : '',
    props.error     ? 'field--error' : '',
    props.className ?? '',
  ].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      <label className="field__label">
        {props.label}
        {props.required && <span className="field__required">*</span>}
      </label>
      {props.children}
      {props.error && <div className="field__error">{props.error}</div>}
    </div>
  )
}
