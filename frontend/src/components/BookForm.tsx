import { useState, type FormEvent } from 'react'
import { X, Save, BookPlus } from 'lucide-react'
import type { Book, BookCreateRequest, BookUpdateRequest } from '../types/book'
import './StudentForm.scss'

type Payload = BookCreateRequest | BookUpdateRequest

interface Props {
  mode:     'create' | 'edit'
  initial?: Book
  onClose:  () => void
  onSaved:  (saved: Book) => void
  onSubmit: (payload: Payload) => Promise<Book>
}

interface FormState {
  name: string; code: string; specialty: string; format: string; edition: string
  pages: string; salePrice: string; studentDiscountPct: string; royaltyPoolPct: string
  costPerUnit: string; stockQuantity: string; branch: string
}

function initialState(b?: Book): FormState {
  return {
    name:               b?.name ?? '',
    code:               b?.code ?? '',
    specialty:          b?.specialty ?? '',
    format:             b?.format ?? '',
    edition:            b?.edition ?? '',
    pages:              b?.pages != null ? String(b.pages) : '',
    salePrice:          b?.salePrice != null ? String(b.salePrice) : '',
    studentDiscountPct: b?.studentDiscountPct != null ? String(b.studentDiscountPct) : '',
    royaltyPoolPct:     b?.royaltyPoolPct != null ? String(b.royaltyPoolPct) : '',
    costPerUnit:        b?.costPerUnit != null ? String(b.costPerUnit) : '',
    stockQuantity:      b?.stockQuantity != null ? String(b.stockQuantity) : '',
    branch:             b?.branch ?? '',
  }
}

export default function BookForm({ mode, initial, onClose, onSaved, onSubmit }: Props) {
  const isCreate = mode === 'create'
  const Icon = isCreate ? BookPlus : Save

  const [state,       setState]       = useState<FormState>(initialState(initial))
  const [errors,      setErrors]      = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function numOnly(v: string, label: keyof FormState, e: Partial<Record<keyof FormState, string>>) {
    if (!v) return
    if (Number.isNaN(Number(v))) e[label] = 'No es un número válido'
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!state.name.trim())      e.name = 'Obligatorio'
    if (state.name.length > 255) e.name = 'Máx 255 caracteres'
    if (!state.salePrice)        e.salePrice = 'Obligatorio'
    numOnly(state.salePrice, 'salePrice', e)
    numOnly(state.studentDiscountPct, 'studentDiscountPct', e)
    numOnly(state.royaltyPoolPct, 'royaltyPoolPct', e)
    numOnly(state.costPerUnit, 'costPerUnit', e)
    numOnly(state.pages, 'pages', e)
    if (isCreate) numOnly(state.stockQuantity, 'stockQuantity', e)
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)

    const numOrNull = (v: string) => (v ? Number(v) : null)
    const base = {
      name:               state.name.trim(),
      code:               state.code.trim() || null,
      specialty:          state.specialty.trim() || null,
      format:             state.format.trim() || null,
      edition:            state.edition.trim() || null,
      pages:              numOrNull(state.pages),
      salePrice:          Number(state.salePrice),
      studentDiscountPct: numOrNull(state.studentDiscountPct),
      royaltyPoolPct:     numOrNull(state.royaltyPoolPct),
      costPerUnit:        numOrNull(state.costPerUnit),
      branch:             state.branch.trim() || null,
    }
    // En alta se manda el stock inicial; en edición se gestiona por endpoint aparte.
    const payload: Payload = isCreate
      ? { ...base, stockQuantity: numOrNull(state.stockQuantity) } as BookCreateRequest
      : base as BookUpdateRequest

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
      <div className="modal" onClick={ev => ev.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><Icon size={18} /></div>
            <h3 className="modal__title">{isCreate ? 'Nuevo libro' : 'Editar libro'}</h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="form__grid">
            <Field label="Nombre" required error={errors.name} full>
              <input type="text" value={state.name} maxLength={255} autoFocus
                onChange={e => setField('name', e.target.value)} placeholder="Manual de…" />
            </Field>
            <Field label="Código" error={errors.code}>
              <input type="text" value={state.code} maxLength={50}
                onChange={e => setField('code', e.target.value)} placeholder="LIB-XXX" />
            </Field>
            <Field label="Especialidad" error={errors.specialty}>
              <input type="text" value={state.specialty} maxLength={100}
                onChange={e => setField('specialty', e.target.value)} placeholder="Cardiología" />
            </Field>
            <Field label="Formato" error={errors.format}>
              <select value={state.format} onChange={e => setField('format', e.target.value)}>
                <option value="">—</option>
                <option value="Impreso">Impreso</option>
                <option value="Digital">Digital</option>
              </select>
            </Field>
            <Field label="Edición" error={errors.edition}>
              <input type="text" value={state.edition} maxLength={50}
                onChange={e => setField('edition', e.target.value)} placeholder="1ra, 2026…" />
            </Field>
            <Field label="Páginas" error={errors.pages}>
              <input type="number" value={state.pages}
                onChange={e => setField('pages', e.target.value)} />
            </Field>
            <Field label="Sucursal / unidad" error={errors.branch}>
              <input type="text" value={state.branch} maxLength={50}
                onChange={e => setField('branch', e.target.value)} placeholder="Residencias…" />
            </Field>
            <Field label="Precio venta (ARS)" required error={errors.salePrice}>
              <input type="number" step="any" value={state.salePrice}
                onChange={e => setField('salePrice', e.target.value)} placeholder="45000" />
            </Field>
            <Field label="Descuento alumno (%)" error={errors.studentDiscountPct}>
              <input type="number" step="any" value={state.studentDiscountPct}
                onChange={e => setField('studentDiscountPct', e.target.value)} placeholder="30" />
            </Field>
            <Field label="% venta a autorías (pool)" error={errors.royaltyPoolPct}>
              <input type="number" step="any" value={state.royaltyPoolPct}
                onChange={e => setField('royaltyPoolPct', e.target.value)} placeholder="10" />
            </Field>
            <Field label="Costo por unidad (ARS)" error={errors.costPerUnit}>
              <input type="number" step="any" value={state.costPerUnit}
                onChange={e => setField('costPerUnit', e.target.value)} />
            </Field>
            {isCreate && (
              <Field label="Stock inicial" error={errors.stockQuantity}>
                <input type="number" value={state.stockQuantity}
                  onChange={e => setField('stockQuantity', e.target.value)} placeholder="0" />
              </Field>
            )}
          </div>

          <p className="form__note">
            Los <strong>autores y su % de autoría</strong> se gestionan desde el detalle del libro
            (botón “Ver detalle” → sección Autores), después de crearlo.
            {!isCreate && <> El <strong>stock</strong> se ajusta desde el detalle (no se modifica acá para no pisar las ventas).</>}
          </p>

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isCreate ? 'Crear libro' : 'Guardar cambios'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function Field(props: { label: string; required?: boolean; error?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`field ${props.full ? 'field--full' : ''} ${props.error ? 'field--error' : ''}`}>
      <label className="field__label">
        {props.label}{props.required && <span className="field__required">*</span>}
      </label>
      {props.children}
      {props.error && <div className="field__error">{props.error}</div>}
    </div>
  )
}
