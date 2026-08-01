import { useState, type FormEvent, type ReactNode } from 'react'
import { X, CalendarDays } from 'lucide-react'
import { teachingApi } from '../api/teaching'
import type { ClassSession, ClassSessionRequest } from '../types/teaching'
import type { Staff } from '../types/staff'
import { toastSuccess } from '../lib/confirm'
import './StudentForm.scss'

interface Props {
  initial?: ClassSession
  staff:    Staff[]
  onClose:  () => void
  onSaved:  () => void
}

interface FormState {
  sessionDate:   string
  commission:    string
  subject:       string
  classLabel:    string
  synchronous:   boolean
  scheduledTime: string
  zoomAccount:   string
  sessionLink:   string
  teacherId:     string
  preceptorId:   string
  // Horas y minutos por separado: la planilla las anota como «2 h 50» y pedir un
  // decimal («2.83») es una fuente de errores para quien carga.
  hoursPart:     string
  minutesPart:   string
  notes:         string
}

function splitHours(h: number | null | undefined): { hoursPart: string; minutesPart: string } {
  if (h == null) return { hoursPart: '', minutesPart: '' }
  const whole = Math.floor(h)
  const mins = Math.round((h - whole) * 60)
  return { hoursPart: String(whole), minutesPart: mins === 0 ? '' : String(mins) }
}

function initialState(s?: ClassSession): FormState {
  const { hoursPart, minutesPart } = splitHours(s?.actualHours)
  return {
    sessionDate:   s?.sessionDate ?? new Date().toISOString().slice(0, 10),
    commission:    s?.commission ?? '',
    subject:       s?.subject ?? '',
    classLabel:    s?.classLabel ?? '',
    synchronous:   s?.synchronous !== false,
    scheduledTime: s?.scheduledTime ?? '',
    zoomAccount:   s?.zoomAccount ?? '',
    sessionLink:   s?.sessionLink ?? '',
    teacherId:     s?.teacherId ?? '',
    preceptorId:   s?.preceptorId ?? '',
    hoursPart, minutesPart,
    notes:         s?.notes ?? '',
  }
}

export default function ClassSessionForm({ initial, staff, onClose, onSaved }: Props) {
  const editing = initial != null
  const [form, setForm] = useState<FormState>(() => initialState(initial))
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const teachers = staff.filter(s => s.staffType === 'DOCENTE' || s.staffType === 'DIRECTORA')
  const preceptors = staff.filter(s => s.staffType === 'PRECEPTORA')

  function blankToNull(v: string): string | null {
    const t = v.trim()
    return t === '' ? null : t
  }

  /** Horas + minutos → decimal. 2 h 50 → 2,83. */
  function toDecimalHours(): number | null {
    const h = form.hoursPart.trim()
    const m = form.minutesPart.trim()
    if (h === '' && m === '') return null
    const hours = h === '' ? 0 : Number(h)
    const mins = m === '' ? 0 : Number(m)
    if (Number.isNaN(hours) || Number.isNaN(mins)) return null
    return Math.round((hours + mins / 60) * 100) / 100
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const mins = form.minutesPart.trim()
    if (mins !== '' && (Number(mins) < 0 || Number(mins) > 59)) {
      setError('Los minutos tienen que estar entre 0 y 59')
      return
    }

    setSaving(true); setError(null)
    const payload: ClassSessionRequest = {
      sessionDate:   form.sessionDate,
      commission:    blankToNull(form.commission),
      subject:       blankToNull(form.subject),
      classLabel:    blankToNull(form.classLabel),
      synchronous:   form.synchronous,
      scheduledTime: blankToNull(form.scheduledTime),
      zoomAccount:   blankToNull(form.zoomAccount),
      sessionLink:   blankToNull(form.sessionLink),
      teacherId:     form.teacherId   || null,
      preceptorId:   form.preceptorId || null,
      actualHours:   toDecimalHours(),
      notes:         blankToNull(form.notes),
    }

    try {
      if (editing) await teachingApi.updateSession(initial.id, payload)
      else         await teachingApi.createSession(payload)
      toastSuccess(editing ? 'Clase actualizada' : 'Clase cargada')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><CalendarDays size={18} /></div>
            <h3 className="modal__title">{editing ? 'Editar clase' : 'Nueva clase'}</h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="form__grid">
            <Field label="Fecha" required>
              <input type="date" value={form.sessionDate} autoFocus required
                onChange={e => set('sessionDate', e.target.value)} />
            </Field>
            <Field label="Horario" hint="Como en la planilla: 18-20">
              <input type="text" value={form.scheduledTime} maxLength={50}
                onChange={e => set('scheduledTime', e.target.value)} placeholder="18-20" />
            </Field>

            <Field label="Comisión" hint="COM 9, COM 10, comunidad imedba…">
              <input type="text" value={form.commission} maxLength={100}
                onChange={e => set('commission', e.target.value)} />
            </Field>
            <Field label="Materia">
              <input type="text" value={form.subject} maxLength={200}
                onChange={e => set('subject', e.target.value)} />
            </Field>

            <div className="field field--full">
              <label className="field__label">Clase</label>
              <input type="text" value={form.classLabel} maxLength={300}
                onChange={e => set('classLabel', e.target.value)}
                placeholder="Cierre módulo 9" />
            </div>

            <Field label="Docente" hint="Puede quedar vacío (cierres de módulo)">
              <select value={form.teacherId} onChange={e => set('teacherId', e.target.value)}>
                <option value="">— Sin asignar —</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.lastName}, {t.firstName}</option>
                ))}
              </select>
            </Field>
            <Field label="Preceptora" hint="Se asigna por clase; cobra 15 min extra">
              <select value={form.preceptorId} onChange={e => set('preceptorId', e.target.value)}
                disabled={!form.synchronous}>
                <option value="">— Sin asignar —</option>
                {preceptors.map(p => (
                  <option key={p.id} value={p.id}>{p.lastName}, {p.firstName}</option>
                ))}
              </select>
            </Field>

            <Field label="Duración — horas">
              <input type="number" min={0} step={1} value={form.hoursPart}
                onChange={e => set('hoursPart', e.target.value)} placeholder="2" />
            </Field>
            <Field label="Duración — minutos">
              <input type="number" min={0} max={59} step={1} value={form.minutesPart}
                onChange={e => set('minutesPart', e.target.value)} placeholder="50" />
            </Field>

            <div className="field field--full">
              <label className="field__check">
                <input type="checkbox" checked={form.synchronous}
                  onChange={e => {
                    set('synchronous', e.target.checked)
                    // Una clase asincrónica no tiene preceptora: si se destilda,
                    // se limpia para no dejar una asignación que no corresponde.
                    if (!e.target.checked) set('preceptorId', '')
                  }} />
                <span>Clase en vivo (sincrónica)</span>
              </label>
              <p className="field__hint">
                Destildar para asincrónicas: no tienen preceptora y <strong>no entran en la
                liquidación</strong>.
              </p>
            </div>

            <Field label="Cuenta Zoom">
              <input type="text" value={form.zoomAccount} maxLength={200}
                onChange={e => set('zoomAccount', e.target.value)} />
            </Field>
            <Field label="Link">
              <input type="url" value={form.sessionLink} maxLength={500}
                onChange={e => set('sessionLink', e.target.value)} />
            </Field>

            <div className="field field--full">
              <label className="field__label">Observaciones</label>
              <textarea rows={2} value={form.notes}
                onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          {error && <div className="form__error">{error}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Cargar clase')}
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
