import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { X, Save, ShoppingBag } from 'lucide-react'
import type { BookSale, BookSaleCreateRequest } from '../types/book-sale'
import type { Book } from '../types/book'
import type { Student } from '../types/student'
import { booksApi } from '../api/books'
import { studentsApi } from '../api/students'
import './StudentForm.scss'

interface Props {
  onClose:  () => void
  onSaved:  (saved: BookSale) => void
  onSubmit: (payload: BookSaleCreateRequest) => Promise<BookSale>
}

interface FormState {
  bookId:               string
  quantity:             string
  applyStudentDiscount: boolean
  studentId:            string
  notes:                string
}

export default function BookSaleForm({ onClose, onSaved, onSubmit }: Props) {
  const [state, setState] = useState<FormState>({
    bookId: '', quantity: '1', applyStudentDiscount: false, studentId: '', notes: '',
  })
  const [errors,      setErrors]      = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)

  const [books,    setBooks]    = useState<Book[]>([])
  const [students, setStudents] = useState<Student[]>([])

  useEffect(() => {
    booksApi.list({ active: true, size: 500, sort: 'name,asc' })
      .then(res => setBooks(res.content)).catch(() => setBooks([]))
    studentsApi.list({ active: true, size: 1000, sort: 'lastName,asc' })
      .then(res => setStudents(res.content)).catch(() => setStudents([]))
  }, [])

  const book = useMemo(() => books.find(b => b.id === state.bookId), [books, state.bookId])
  const qty  = Number(state.quantity) || 0
  const discPct = book?.studentDiscountPct ?? 0
  const unit = book
    ? (state.applyStudentDiscount ? Math.round(book.salePrice * (1 - discPct / 100)) : book.salePrice)
    : 0
  const total = unit * qty

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!state.bookId) e.bookId = 'Elegí un libro'
    if (!state.quantity) e.quantity = 'Obligatorio'
    else if (Number.isNaN(Number(state.quantity))) e.quantity = 'No es un número válido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true); setSubmitError(null)
    const payload: BookSaleCreateRequest = {
      bookId:               state.bookId,
      quantity:             Number(state.quantity),
      applyStudentDiscount: state.applyStudentDiscount,
      studentId:            state.studentId || null,
      notes:                state.notes.trim() || null,
    }
    try {
      const saved = await onSubmit(payload)
      onSaved(saved)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al registrar la venta')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={ev => ev.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><ShoppingBag size={18} /></div>
            <h3 className="modal__title">Registrar venta</h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <Field label="Libro" required error={errors.bookId} full>
            <select value={state.bookId} onChange={e => setField('bookId', e.target.value)} autoFocus>
              <option value="">— Seleccionar libro —</option>
              {books.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} · {formatPrice(b.salePrice)}{b.stockQuantity != null ? ` · stock ${b.stockQuantity}` : ''}
                </option>
              ))}
            </select>
          </Field>

          <div className="form__grid">
            <Field label="Cantidad" required error={errors.quantity}>
              <input type="number" value={state.quantity}
                onChange={e => setField('quantity', e.target.value)} />
            </Field>
            <Field label="Alumno (opcional)">
              <select value={state.studentId} onChange={e => setField('studentId', e.target.value)}>
                <option value="">— Sin alumno —</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.lastName}, {s.firstName}</option>)}
              </select>
            </Field>
          </div>

          <label className="sale-check">
            <input type="checkbox" checked={state.applyStudentDiscount}
              onChange={e => setField('applyStudentDiscount', e.target.checked)} />
            <span>Aplicar descuento de alumno {discPct > 0 ? `(${discPct}% off)` : ''}</span>
          </label>

          <Field label="Observaciones" full>
            <textarea rows={2} value={state.notes} onChange={e => setField('notes', e.target.value)}
              placeholder="Notas internas…" />
          </Field>

          {book && (
            <div className="sale-total">
              <span>Precio unitario <strong>{formatPrice(unit)}</strong> × {qty}</span>
              <span className="sale-total__amount">{formatPrice(total)}</span>
            </div>
          )}

          <p className="form__note">
            El descuento de alumno se aplica sobre el precio de lista del libro. La venta es
            <strong> append-only</strong> (no se edita ni borra) y descuenta stock automáticamente.
          </p>

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={15} /> {saving ? 'Guardando…' : 'Registrar venta'}
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

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}
