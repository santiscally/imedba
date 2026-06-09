import { useEffect, useState, type FormEvent } from 'react'
import { X, Save, Library, Plus } from 'lucide-react'
import type {
  Collection, CollectionCreateRequest, CollectionVariant,
} from '../types/collection'
import { COLLECTION_VARIANTS, COLLECTION_VARIANT_LABELS } from '../types/collection'
import type { Book } from '../types/book'
import { booksApi } from '../api/books'
import './StudentForm.scss'

interface Props {
  mode:     'create' | 'edit'
  initial?: Collection
  onClose:  () => void
  onSaved:  (saved: Collection) => void
  onSubmit: (payload: CollectionCreateRequest) => Promise<Collection>
}

export default function CollectionForm({ mode, initial, onClose, onSaved, onSubmit }: Props) {
  const [name,     setName]     = useState(initial?.name ?? '')
  const [variant,  setVariant]  = useState<CollectionVariant>(initial?.variant ?? 'TRADICIONAL')
  const [price,    setPrice]    = useState(initial?.price != null ? String(initial.price) : '')
  const [discount, setDiscount] = useState(initial?.studentDiscountPct != null ? String(initial.studentDiscountPct) : '35')
  const [bookIds,  setBookIds]  = useState<string[]>(initial?.books.map(b => b.id) ?? [])

  const [books, setBooks] = useState<Book[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    booksApi.list({ active: true, size: 500, sort: 'name,asc' })
      .then(res => {
        setBooks(res.content)
        // Podar ids fantasma: libros que estaban en la colección pero fueron
        // borrados/desactivados después. Si no, el contador dice "3 seleccionado(s)"
        // con sólo 2 checkboxes visibles, y el id muerto se re-enviaría al guardar.
        const valid = new Set(res.content.map(b => b.id))
        setBookIds(prev => prev.filter(id => valid.has(id)))
      })
      .catch(() => setBooks([]))
  }, [])

  function toggleBook(id: string) {
    setBookIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    const p = Number(price)
    if (!price || Number.isNaN(p) || p < 0) { setError('El precio debe ser ≥ 0'); return }
    if (bookIds.length === 0) { setError('Elegí al menos un libro'); return }
    setSaving(true); setError(null)
    try {
      const saved = await onSubmit({
        name: name.trim(),
        variant,
        price: p,
        studentDiscountPct: discount ? Number(discount) : null,
        bookIds,
      })
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  const isCreate = mode === 'create'
  const Icon = isCreate ? Library : Save

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><Icon size={18} /></div>
            <h3 className="modal__title">{isCreate ? 'Nueva colección' : 'Editar colección'}</h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="form__grid">
            <div className="field field--full">
              <label className="field__label">Nombre<span className="field__required">*</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus
                placeholder="Colección Residencias Médicas" />
            </div>
            <div className="field">
              <label className="field__label">Variante<span className="field__required">*</span></label>
              <select value={variant} onChange={e => setVariant(e.target.value as CollectionVariant)}>
                {COLLECTION_VARIANTS.map(v => (
                  <option key={v} value={v}>{COLLECTION_VARIANT_LABELS[v]}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field__label">Precio de lista (ARS)<span className="field__required">*</span></label>
              <input type="number" min="0" step="any" value={price}
                onChange={e => setPrice(e.target.value)} placeholder="700000" />
            </div>
            <div className="field">
              <label className="field__label">Descuento alumno (%)</label>
              <input type="number" min="0" step="0.01" value={discount}
                onChange={e => setDiscount(e.target.value)} placeholder="35" />
              <span className="field__hint">Se aplica al vender la colección a un alumno.</span>
            </div>
          </div>

          <div className="field field--full">
            <label className="field__label">
              Libros de la colección<span className="field__required">*</span>
              <span className="field__hint"> · {bookIds.length} seleccionado(s)</span>
            </label>
            {books.length === 0 ? (
              <p className="field__hint">No hay libros en el catálogo. Creá libros primero en la sección Libros.</p>
            ) : (
              <div className="checklist">
                {books.map(b => (
                  <label key={b.id} className="checklist__item">
                    <input type="checkbox" checked={bookIds.includes(b.id)} onChange={() => toggleBook(b.id)} />
                    <span className="checklist__name">{b.name}</span>
                    {b.salePrice != null && (
                      <span className="checklist__price">
                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(b.salePrice)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <div className="form__error">{error}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isCreate ? <><Plus size={15} /> Crear colección</> : 'Guardar cambios'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
