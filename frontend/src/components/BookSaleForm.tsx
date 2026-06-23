import { useEffect, useState, type FormEvent } from 'react'
import { X, Save, ShoppingBag, Plus, Trash2 } from 'lucide-react'
import type { BookSale, BookSaleCreateRequest } from '../types/book-sale'
import type { Book } from '../types/book'
import type { Student } from '../types/student'
import type { DiscountCampaign } from '../types/discount-campaign'
import { booksApi } from '../api/books'
import { studentsApi } from '../api/students'
import { discountCampaignsApi } from '../api/discount-campaigns'
import './StudentForm.scss'

interface Props {
  onClose:  () => void
  onSaved:  (saved: BookSale) => void
  onSubmit: (payload: BookSaleCreateRequest) => Promise<BookSale>
}

// Una fila de la venta: un libro + cantidad (reunión 12-jun §3.2: varios libros en una operación).
interface Item { bookId: string; quantity: string }

export default function BookSaleForm({ onClose, onSaved, onSubmit }: Props) {
  const [items, setItems] = useState<Item[]>([{ bookId: '', quantity: '1' }])
  // Datos compartidos por toda la venta.
  const [studentId, setStudentId] = useState('')
  const [applyStudentDiscount, setApplyStudentDiscount] = useState(false)
  const [notes, setNotes] = useState('')
  // Promo/descuento explícito (§3.1), también compartido para la operación.
  const [campaignId, setCampaignId]   = useState('')
  const [discountPct, setDiscountPct] = useState('')

  const [books,     setBooks]     = useState<Book[]>([])
  const [students,  setStudents]  = useState<Student[]>([])
  const [campaigns, setCampaigns] = useState<DiscountCampaign[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    booksApi.list({ active: true, size: 500, sort: 'name,asc' })
      .then(res => setBooks(res.content)).catch(() => setBooks([]))
    studentsApi.list({ active: true, size: 1000, sort: 'lastName,asc' })
      .then(res => setStudents(res.content)).catch(() => setStudents([]))
    discountCampaignsApi.list({ active: true, size: 200, sort: 'name,asc' })
      .then(res => setCampaigns(res.content)).catch(() => setCampaigns([]))
  }, [])

  const campaign = campaigns.find(c => c.id === campaignId)
  const manualPct = Number(discountPct) || 0
  const usingExplicit = !!campaign || manualPct > 0

  function bookById(id: string): Book | undefined {
    return books.find(b => b.id === id)
  }

  // Descuento % efectivo para un libro: promo (PERCENTAGE directo / FIXED → % del precio) o
  // manual tienen prioridad; si no, el descuento de alumno (si está tildado).
  function effectivePct(b: Book | undefined): number {
    if (!b) return 0
    if (campaign) {
      return campaign.discountType === 'PERCENTAGE'
        ? campaign.discountValue
        : (b.salePrice > 0 ? Math.round((campaign.discountValue / b.salePrice) * 10000) / 100 : 0)
    }
    if (manualPct > 0) return manualPct
    return applyStudentDiscount ? (b.studentDiscountPct ?? 0) : 0
  }

  function rowTotal(it: Item): number {
    const b = bookById(it.bookId)
    if (!b) return 0
    const unit = Math.round(b.salePrice * (1 - effectivePct(b) / 100))
    return unit * (Number(it.quantity) || 0)
  }

  const grandTotal = items.reduce((acc, it) => acc + rowTotal(it), 0)

  function setItem(idx: number, patch: Partial<Item>) {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function addItem() { setItems(prev => [...prev, { bookId: '', quantity: '1' }]) }
  function removeItem(idx: number) {
    setItems(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
  }

  function pickStudent(id: string) {
    setStudentId(id)
    // Auto-descuento por alumno (§3.3): con alumno se aplica; sin alumno se quita.
    setApplyStudentDiscount(!!id)
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    const rows = items.filter(it => it.bookId && Number(it.quantity) > 0)
    if (rows.length === 0) { setSubmitError('Agregá al menos un libro con cantidad.'); return }
    // Sin libros repetidos (confunde el resumen y el stock).
    if (new Set(rows.map(r => r.bookId)).size !== rows.length) {
      setSubmitError('Hay un libro repetido: sumá la cantidad en una sola fila.'); return
    }
    setSaving(true); setSubmitError(null)
    try {
      let last: BookSale | null = null
      for (const it of rows) {
        const pct = effectivePct(bookById(it.bookId))
        last = await onSubmit({
          bookId:               it.bookId,
          quantity:             Number(it.quantity),
          studentId:            studentId || null,
          applyStudentDiscount: usingExplicit ? false : applyStudentDiscount,
          discountPercentage:   usingExplicit && pct > 0 ? pct : null,
          notes:                notes.trim() || null,
        })
      }
      if (last) onSaved(last)
    } catch (err) {
      setSubmitError(err instanceof Error
        ? `${err.message} (las ventas anteriores de esta operación sí quedaron registradas)`
        : 'Error al registrar la venta')
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
          <Field label="Libros" required full>
            <div className="sale-items">
              {items.map((it, idx) => {
                const b = bookById(it.bookId)
                return (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <select value={it.bookId} onChange={e => setItem(idx, { bookId: e.target.value })}
                      style={{ flex: 1 }} autoFocus={idx === 0}>
                      <option value="">— Seleccionar libro —</option>
                      {books.map(bk => (
                        <option key={bk.id} value={bk.id}>
                          {bk.name} · {formatPrice(bk.salePrice)}{bk.stockQuantity != null ? ` · stock ${bk.stockQuantity}` : ''}
                        </option>
                      ))}
                    </select>
                    <input type="number" min="1" value={it.quantity}
                      onChange={e => setItem(idx, { quantity: e.target.value })}
                      style={{ width: '4.5rem' }} aria-label="Cantidad" />
                    <span style={{ width: '6.5rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600 }}>
                      {b ? formatPrice(rowTotal(it)) : '—'}
                    </span>
                    <button type="button" className="row-actions__btn" onClick={() => removeItem(idx)}
                      disabled={items.length === 1} aria-label="Quitar libro" title="Quitar">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
              <button type="button" className="btn-ghost" onClick={addItem} style={{ marginTop: '0.2rem' }}>
                <Plus size={14} /> Agregar libro
              </button>
            </div>
          </Field>

          <Field label="Alumno (opcional)" full>
            <select value={studentId} onChange={e => pickStudent(e.target.value)}>
              <option value="">— Sin alumno —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.lastName}, {s.firstName}</option>)}
            </select>
          </Field>

          <label className="sale-check">
            <input type="checkbox" checked={applyStudentDiscount}
              onChange={e => setApplyStudentDiscount(e.target.checked)} disabled={usingExplicit} />
            <span>Aplicar descuento de alumno (por libro)</span>
          </label>

          <div className="form__grid">
            {campaigns.length > 0 && (
              <Field label="Promo / Campaña">
                <select value={campaignId} onChange={e => { setCampaignId(e.target.value); if (e.target.value) setDiscountPct('') }}>
                  <option value="">— Sin promo —</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.discountType === 'FIXED' ? `$${c.discountValue}` : `${c.discountValue}%`})
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Descuento % (manual)">
              <input type="number" step="0.01" value={discountPct}
                onChange={e => { setDiscountPct(e.target.value); if (campaignId) setCampaignId('') }}
                placeholder="0" />
            </Field>
          </div>

          <Field label="Observaciones" full>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Notas internas…" />
          </Field>

          <div className="sale-total">
            <span>Total ({items.filter(it => it.bookId).length} {items.filter(it => it.bookId).length === 1 ? 'libro' : 'libros'})</span>
            <span className="sale-total__amount">{formatPrice(grandTotal)}</span>
          </div>

          <p className="form__note">
            El descuento se aplica sobre el precio de lista; el % explícito (promo/manual) tiene
            prioridad sobre el de alumno. Cada libro se registra como una venta <strong>append-only</strong>
            y descuenta stock automáticamente.
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
