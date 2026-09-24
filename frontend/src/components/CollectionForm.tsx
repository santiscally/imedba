import { useEffect, useState, type FormEvent } from 'react'
import { X, Save, Library, Plus } from 'lucide-react'
import type {
  Collection, CollectionCreateRequest, CollectionVariant,
} from '../types/collection'
import { COLLECTION_VARIANTS, COLLECTION_VARIANT_LABELS } from '../types/collection'
import type { Book } from '../types/book'
import type { BusinessUnit } from '../types/course'
import { BUSINESS_UNIT_LABELS } from '../types/course'
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
  const [unit,     setUnit]     = useState<BusinessUnit | ''>(initial?.businessUnit ?? '')
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

  const listPrice = books
    .filter(b => bookIds.includes(b.id))
    .reduce((acc, b) => acc + (b.salePrice ?? 0), 0)

  function toggleBook(id: string) {
    setBookIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (bookIds.length === 0) { setError('Elegí al menos un libro'); return }
    setSaving(true); setError(null)
    try {
      const saved = await onSubmit({
        name: name.trim(),
        businessUnit: unit === '' ? null : unit,
        variant,
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
              <label className="field__label">Unidad de negocio</label>
              <select value={unit} onChange={e => setUnit(e.target.value as BusinessUnit | '')}>
                <option value="">Todas las unidades</option>
                {(['RESIDENCIAS', 'FORMACION_SUPERIOR', 'EDITORIAL'] as BusinessUnit[]).map(u => (
                  <option key={u} value={u}>{BUSINESS_UNIT_LABELS[u]}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field__label">Precio de lista (ARS)</label>
              <input type="text" readOnly value={formatARS(listPrice)} />
              <span className="field__hint">Suma de los libros elegidos.</span>
            </div>
            <div className="field">
              <label className="field__label">Descuento alumno (%)</label>
              <input type="number" step="0.01" value={discount}
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
                      <span className="checklist__price">{formatARS(b.salePrice)}</span>
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

function formatARS(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}
