import { useState, type FormEvent, type ReactNode } from 'react'
import { X, GraduationCap } from 'lucide-react'
import { staffApi } from '../api/staff'
import type {
  Staff, StaffCreateRequest, StaffSegment, StaffType,
} from '../types/staff'
import {
  STAFF_SEGMENTS, STAFF_SEGMENT_LABELS, STAFF_TYPES, STAFF_TYPE_LABELS,
} from '../types/staff'
import { toastSuccess } from '../lib/confirm'
import './StudentForm.scss'

interface Props {
  initial?: Staff          // undefined = alta
  onClose:  () => void
  onSaved:  () => void
}

/** Estado del form. Todo string para no pelear con inputs controlados vacíos. */
interface FormState {
  firstName:   string
  lastName:    string
  email:       string
  phone:       string
  dni:         string
  subject:     string
  staffType:   StaffType
  segment:     StaffSegment | ''
  paidByHours: boolean
  tutor:       boolean
  hourlyRate:  string
  notes:       string
}

function initialState(s?: Staff): FormState {
  return {
    firstName:   s?.firstName ?? '',
    lastName:    s?.lastName ?? '',
    email:       s?.email ?? '',
    phone:       s?.phone ?? '',
    dni:         s?.dni ?? '',
    subject:     s?.subject ?? '',
    staffType:   s?.staffType ?? 'DOCENTE',
    segment:     s?.segment ?? '',
    paidByHours: s?.paidByHours ?? true,
    tutor:       s?.tutor ?? false,
    hourlyRate:  s?.hourlyRate != null ? String(s.hourlyRate) : '',
    notes:       s?.notes ?? '',
  }
}

export default function StaffForm({ initial, onClose, onSaved }: Props) {
  const editing = initial != null
  const [form, setForm] = useState<FormState>(() => initialState(initial))
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState<string | null>(null)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  /** '' → null para que el backend distinga "sin dato" de "string vacío". */
  function blankToNull(v: string): string | null {
    const t = v.trim()
    return t === '' ? null : t
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)

    const rate = form.hourlyRate.trim()
    if (rate !== '' && (Number.isNaN(Number(rate)) || Number(rate) < 0)) {
      setError('El valor hora tiene que ser un número mayor o igual a 0')
      setSaving(false)
      return
    }

    const payload: StaffCreateRequest = {
      firstName:   form.firstName.trim(),
      lastName:    form.lastName.trim(),
      email:       blankToNull(form.email),
      phone:       blankToNull(form.phone),
      staffType:   form.staffType,
      dni:         blankToNull(form.dni),
      subject:     blankToNull(form.subject),
      segment:     form.segment === '' ? null : form.segment,
      paidByHours: form.paidByHours,
      tutor:       form.tutor,
      hourlyRate:  rate === '' ? null : Number(rate),
      notes:       blankToNull(form.notes),
    }

    try {
      if (editing) await staffApi.update(initial.id, payload)
      else         await staffApi.create(payload)
      toastSuccess(editing ? 'Personal actualizado' : 'Personal cargado')
      onSaved()
    } catch (err) {
      // El backend devuelve un 409 con el nombre de quien ya tenía ese DNI.
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><GraduationCap size={18} /></div>
            <h3 className="modal__title">
              {editing ? 'Editar personal académico' : 'Nuevo personal académico'}
            </h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="form__grid">
            <Field label="Nombre" required>
              <input type="text" value={form.firstName} autoFocus maxLength={100}
                onChange={e => set('firstName', e.target.value)} required />
            </Field>
            <Field label="Apellido" required>
              <input type="text" value={form.lastName} maxLength={100}
                onChange={e => set('lastName', e.target.value)} required />
            </Field>

            <Field label="DNI">
              <input type="text" value={form.dni} maxLength={20}
                onChange={e => set('dni', e.target.value)} />
            </Field>
            <Field label="Teléfono">
              <input type="tel" value={form.phone} maxLength={50}
                onChange={e => set('phone', e.target.value)} />
            </Field>

            <Field label="Email">
              <input type="email" value={form.email} maxLength={255}
                onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="Rol" required>
              <select value={form.staffType}
                onChange={e => set('staffType', e.target.value as StaffType)}>
                {STAFF_TYPES.map(t => (
                  <option key={t} value={t}>{STAFF_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </Field>

            <Field label="Unidad">
              <select value={form.segment}
                onChange={e => set('segment', e.target.value as StaffSegment | '')}>
                <option value="">— Sin especificar —</option>
                {STAFF_SEGMENTS.map(s => (
                  <option key={s} value={s}>{STAFF_SEGMENT_LABELS[s]}</option>
                ))}
              </select>
            </Field>
            <Field label="Valor hora" hint="Vacío = usa el valor del rol">
              <input type="number" min={0} step="0.01" value={form.hourlyRate}
                onChange={e => set('hourlyRate', e.target.value)} />
            </Field>

            <div className="field field--full">
              <label className="field__label">Materia/s que da</label>
              <input type="text" value={form.subject} maxLength={200}
                onChange={e => set('subject', e.target.value)} />
            </div>

            <div className="field field--full">
              <label className="field__check">
                <input type="checkbox" checked={form.paidByHours}
                  onChange={e => set('paidByHours', e.target.checked)} />
                <span>Se liquida por horas</span>
              </label>
              <p className="field__hint">
                Destildar si cobra sueldo fijo: queda fuera de la liquidación por horas.
              </p>
            </div>

            <div className="field field--full">
              <label className="field__check">
                <input type="checkbox" checked={form.tutor}
                  onChange={e => set('tutor', e.target.checked)} />
                <span>También es tutora</span>
              </label>
              <p className="field__hint">
                Hace seguimiento de alumnos además de su rol. No cambia cómo se le liquida.
              </p>
            </div>

            <div className="field field--full">
              <label className="field__label">Observaciones</label>
              <textarea rows={3} value={form.notes}
                onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          {error && <div className="form__error">{error}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Cargar')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function Field(props: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className="field__label">
        {props.label}{props.required && <span className="field__required">*</span>}
      </label>
      {props.children}
      {props.hint && <p className="field__hint">{props.hint}</p>}
    </div>
  )
}
