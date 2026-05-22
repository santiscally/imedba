import { useMemo, useState, type FormEvent } from 'react'
import { X, Save, GraduationCap, Plus, Trash2 } from 'lucide-react'
import type {
  Diploma,
  DiplomaCreateRequest,
  DiplomaUpdateRequest,
  PartnerConfig,
} from '../types/diploma'
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

interface PartnerRow { name: string; pct: string; email: string }

interface FormState {
  name:               string
  universityName:     string
  description:        string
  enrollmentPrice:    string
  coursePrice:        string
  taxCommissionPct:   string
  secretarySalary:    string
  advertisingAmount:  string
  adminPct:           string
  universityPct:      string
  imedbaPct:          string
  partners:           PartnerRow[]
}

function partnerToRow(p: PartnerConfig): PartnerRow {
  return { name: p.name, pct: String(p.pct), email: p.email ?? '' }
}

function initialState(d?: Diploma): FormState {
  return {
    name:              d?.name              ?? '',
    universityName:    d?.universityName    ?? '',
    description:       d?.description       ?? '',
    enrollmentPrice:   d?.enrollmentPrice   != null ? String(d.enrollmentPrice)   : '',
    coursePrice:       d?.coursePrice       != null ? String(d.coursePrice)       : '',
    taxCommissionPct:  d?.taxCommissionPct  != null ? String(d.taxCommissionPct)  : '',
    secretarySalary:   d?.secretarySalary   != null ? String(d.secretarySalary)   : '',
    advertisingAmount: d?.advertisingAmount != null ? String(d.advertisingAmount) : '',
    adminPct:          d?.adminPct          != null ? String(d.adminPct)          : '',
    universityPct:     d?.universityPct     != null ? String(d.universityPct)     : '',
    imedbaPct:         d?.imedbaPct         != null ? String(d.imedbaPct)         : '',
    partners:          d?.partnersConfig?.map(partnerToRow) ?? [],
  }
}

type FieldErrors = Partial<Record<keyof FormState, string>> & {
  partners?:    string
  partnerRow?:  Record<number, Partial<Record<keyof PartnerRow, string>>>
}

export default function DiplomaForm({ mode, initial, onClose, onSaved, onSubmit }: Props) {
  const [state,       setState]       = useState<FormState>(initialState(initial))
  const [errors,      setErrors]      = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function setPartner(idx: number, key: keyof PartnerRow, value: string) {
    setState(prev => {
      const next = [...prev.partners]
      next[idx] = { ...next[idx], [key]: value }
      return { ...prev, partners: next }
    })
    setErrors(prev => ({
      ...prev,
      partners: undefined,
      partnerRow: { ...prev.partnerRow, [idx]: { ...prev.partnerRow?.[idx], [key]: undefined } },
    }))
  }

  function addPartner() {
    setState(prev => ({ ...prev, partners: [...prev.partners, { name: '', pct: '', email: '' }] }))
  }

  function removePartner(idx: number) {
    setState(prev => ({ ...prev, partners: prev.partners.filter((_, i) => i !== idx) }))
  }

  // Suma % asignados (admin + universidad + imedba + Σ socias)
  const sumPct = useMemo(() => {
    const a = Number(state.adminPct)      || 0
    const u = Number(state.universityPct) || 0
    const i = Number(state.imedbaPct)     || 0
    const p = state.partners.reduce((acc, x) => acc + (Number(x.pct) || 0), 0)
    return Math.round((a + u + i + p) * 100) / 100
  }, [state.adminPct, state.universityPct, state.imedbaPct, state.partners])

  const sumOver = sumPct > 100

  function validate(): boolean {
    const e: FieldErrors = {}
    if (!state.name.trim())               e.name = 'Obligatorio'
    if (state.name.length > 300)          e.name = 'Máx 300 caracteres'
    if (state.universityName.length > 200) e.universityName = 'Máx 200 caracteres'

    function validateNumber(field: keyof FormState, allowZero: boolean, max?: number, label = 'Número inválido') {
      const v = state[field] as string
      if (!v) return
      const n = Number(v)
      if (Number.isNaN(n) || (allowZero ? n < 0 : n <= 0)) {
        e[field] = label
      } else if (max !== undefined && n > max) {
        e[field] = `Máx ${max}`
      }
    }
    validateNumber('enrollmentPrice',   true,  undefined, 'Debe ser ≥ 0')
    validateNumber('coursePrice',       true,  undefined, 'Debe ser ≥ 0')
    validateNumber('taxCommissionPct',  true,  undefined, 'Debe ser ≥ 0')
    validateNumber('secretarySalary',   true,  undefined, 'Debe ser ≥ 0')
    validateNumber('advertisingAmount', true,  undefined, 'Debe ser ≥ 0')
    validateNumber('adminPct',          true,  undefined, 'Debe ser ≥ 0')
    validateNumber('universityPct',     true,  undefined, 'Debe ser ≥ 0')
    validateNumber('imedbaPct',         true,  undefined, 'Debe ser ≥ 0')

    const rowErrors: Record<number, Partial<Record<keyof PartnerRow, string>>> = {}
    state.partners.forEach((p, i) => {
      const re: Partial<Record<keyof PartnerRow, string>> = {}
      if (!p.name.trim()) re.name = 'Obligatorio'
      const n = Number(p.pct)
      if (!p.pct)                          re.pct = 'Obligatorio'
      else if (Number.isNaN(n) || n < 0)   re.pct = 'Debe ser ≥ 0'
      if (p.email && !/^\S+@\S+\.\S+$/.test(p.email)) re.email = 'Email inválido'
      if (Object.keys(re).length) rowErrors[i] = re
    })
    if (Object.keys(rowErrors).length) e.partnerRow = rowErrors

    if (sumOver) e.partners = `La suma de % asignados es ${sumPct}, no puede superar 100`

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const payload: Payload = {
      name:               state.name.trim(),
      universityName:     state.universityName.trim() || null,
      description:        state.description.trim()    || null,
      enrollmentPrice:    state.enrollmentPrice   ? Number(state.enrollmentPrice)   : null,
      coursePrice:        state.coursePrice       ? Number(state.coursePrice)       : null,
      taxCommissionPct:   state.taxCommissionPct  ? Number(state.taxCommissionPct)  : null,
      secretarySalary:    state.secretarySalary   ? Number(state.secretarySalary)   : null,
      advertisingAmount:  state.advertisingAmount ? Number(state.advertisingAmount) : null,
      adminPct:           state.adminPct          ? Number(state.adminPct)          : null,
      universityPct:      state.universityPct     ? Number(state.universityPct)     : null,
      imedbaPct:          state.imedbaPct         ? Number(state.imedbaPct)         : null,
      partnersConfig:     state.partners.length === 0
        ? null
        : state.partners.map(p => ({
            name:  p.name.trim(),
            pct:   Number(p.pct),
            email: p.email.trim() || null,
          })),
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

          <h4 className="form-section">Precios</h4>
          <div className="form__grid">
            <Field label="Matrícula (ARS)" error={errors.enrollmentPrice}>
              <input
                type="number" min="0" step="any"
                value={state.enrollmentPrice}
                onChange={e => setField('enrollmentPrice', e.target.value)}
                placeholder="250000"
              />
            </Field>
            <Field label="Precio curso (ARS)" error={errors.coursePrice}>
              <input
                type="number" min="0" step="any"
                value={state.coursePrice}
                onChange={e => setField('coursePrice', e.target.value)}
                placeholder="2400000"
              />
            </Field>
          </div>

          <h4 className="form-section">Costos fijos</h4>
          <div className="form__grid">
            <Field label="Comisión impuestos (%)" error={errors.taxCommissionPct}>
              <input
                type="number" min="0" step="0.01"
                value={state.taxCommissionPct}
                onChange={e => setField('taxCommissionPct', e.target.value)}
                placeholder="15"
              />
            </Field>
            <Field label="Sueldo secretaria (ARS)" error={errors.secretarySalary}>
              <input
                type="number" min="0" step="any"
                value={state.secretarySalary}
                onChange={e => setField('secretarySalary', e.target.value)}
                placeholder="180000"
              />
            </Field>
            <Field label="Publicidad (ARS)" error={errors.advertisingAmount}>
              <input
                type="number" min="0" step="any"
                value={state.advertisingAmount}
                onChange={e => setField('advertisingAmount', e.target.value)}
                placeholder="90000"
              />
            </Field>
          </div>

          <h4 className="form-section">
            Reparto (%)
            <span className={`form-section__hint ${sumOver ? 'form-section__hint--err' : ''}`}>
              Total asignado: {sumPct}% / 100%
            </span>
          </h4>
          <div className="form__grid">
            <Field label="Administración (%)" error={errors.adminPct}>
              <input
                type="number" min="0" step="0.01"
                value={state.adminPct}
                onChange={e => setField('adminPct', e.target.value)}
                placeholder="10"
              />
            </Field>
            <Field label="Universidad (%)" error={errors.universityPct}>
              <input
                type="number" min="0" step="0.01"
                value={state.universityPct}
                onChange={e => setField('universityPct', e.target.value)}
                placeholder="30"
              />
            </Field>
            <Field label="IMEDBA (%)" error={errors.imedbaPct}>
              <input
                type="number" min="0" step="0.01"
                value={state.imedbaPct}
                onChange={e => setField('imedbaPct', e.target.value)}
                placeholder="15"
              />
            </Field>
          </div>

          <div className="partners">
            <div className="partners__header">
              <h4 className="form-section partners__title">Socias</h4>
              <button type="button" className="btn-ghost btn-ghost--sm" onClick={addPartner}>
                <Plus size={14} /> Agregar socia
              </button>
            </div>
            {state.partners.length === 0 && (
              <div className="partners__empty">No hay socias configuradas para esta diplomatura.</div>
            )}
            {state.partners.map((p, i) => {
              const rowErr = errors.partnerRow?.[i] ?? {}
              return (
                <div key={i} className="partners__row">
                  <Field label="Nombre" required error={rowErr.name} className="partners__name">
                    <input
                      type="text"
                      value={p.name}
                      onChange={e => setPartner(i, 'name', e.target.value)}
                      placeholder="Dra. Laura Méndez"
                    />
                  </Field>
                  <Field label="Porcentaje (%)" required error={rowErr.pct} className="partners__pct">
                    <input
                      type="number" min="0" step="0.01"
                      value={p.pct}
                      onChange={e => setPartner(i, 'pct', e.target.value)}
                      placeholder="20"
                    />
                  </Field>
                  <Field label="Email" error={rowErr.email} className="partners__email">
                    <input
                      type="email"
                      value={p.email}
                      onChange={e => setPartner(i, 'email', e.target.value)}
                      placeholder="laura@imedba.dev"
                    />
                  </Field>
                  <button
                    type="button"
                    className="partners__remove"
                    onClick={() => removePartner(i)}
                    aria-label="Quitar socia"
                    title="Quitar socia"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
            {errors.partners && <div className="form__error">{errors.partners}</div>}
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
            <button type="submit" className="btn-primary" disabled={saving || sumOver}>
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
