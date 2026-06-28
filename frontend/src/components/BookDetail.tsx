import { useEffect, useState } from 'react'
import {
  X, Pencil, Book as BookIcon, Tag, Layers, Hash, Calendar,
  CircleDollarSign, Boxes, Percent, Users, Plus, Trash2, Save,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Book } from '../types/book'
import type { Author } from '../types/author'
import { authorsApi } from '../api/authors'
import { booksApi } from '../api/books'
import { confirmAction, alertError, toastSuccess } from '../lib/confirm'
import { hasAuthority } from '../lib/auth'
import './StudentDetail.scss'
import '../pages/Editorial.scss'

interface Props {
  book:      Book
  onClose:   () => void
  onEdit:    () => void
  onChanged: (book: Book) => void   // notifica al listado que recargue
}

export default function BookDetail({ book, onClose, onEdit, onChanged }: Props) {
  const [current, setCurrent] = useState<Book>(book)
  const [authorOptions, setAuthorOptions] = useState<Author[]>([])
  const [addAuthorId, setAddAuthorId] = useState('')
  const [addRoyalty,  setAddRoyalty]  = useState('')
  const [busy, setBusy] = useState(false)
  // Alta de autor inline (ya no hay página /autores — se crean acá, dentro del libro).
  const [creating, setCreating] = useState(false)
  const [newFirst, setNewFirst] = useState('')
  const [newLast,  setNewLast]  = useState('')
  // Ajuste manual de stock (PUT /books/{id}/stock).
  const [adjustingStock, setAdjustingStock] = useState(false)
  const [newStock,       setNewStock]       = useState('')
  const [stockReason,    setStockReason]    = useState('')

  useEffect(() => {
    authorsApi.list({ active: true, size: 500, sort: 'lastName,asc' })
      .then(res => setAuthorOptions(res.content))
      .catch(() => setAuthorOptions([]))
  }, [])

  const canWrite = hasAuthority('books:write')
  const assignedTotal = current.authors.reduce((acc, a) => acc + a.royaltyPercentage, 0)
  const available = authorOptions.filter(a => !current.authors.some(ba => ba.authorId === a.id))

  async function handleAdd() {
    const royalty = Number(addRoyalty)
    if (!addAuthorId) { alertError('Elegí un autor'); return }
    if (!addRoyalty || Number.isNaN(royalty)) {
      alertError('% de autoría inválido', 'Debe ser un número.'); return
    }
    setBusy(true)
    try {
      const updated = await booksApi.addAuthor(current.id, { authorId: addAuthorId, royaltyPercentage: royalty })
      setCurrent(updated); onChanged(updated)
      setAddAuthorId(''); setAddRoyalty('')
      toastSuccess('Autor agregado')
    } catch (err) {
      alertError('No se pudo agregar el autor', err instanceof Error ? err.message : undefined)
    } finally { setBusy(false) }
  }

  async function handleCreateAuthor() {
    if (!newFirst.trim() || !newLast.trim()) {
      alertError('Nombre y apellido son obligatorios'); return
    }
    setBusy(true)
    try {
      const created = await authorsApi.create({ firstName: newFirst.trim(), lastName: newLast.trim() })
      setAuthorOptions(prev => [...prev, created])
      setAddAuthorId(created.id)
      setCreating(false); setNewFirst(''); setNewLast('')
      toastSuccess('Autora creada — asignale el % de autoría y agregala')
    } catch (err) {
      alertError('No se pudo crear la autora', err instanceof Error ? err.message : undefined)
    } finally { setBusy(false) }
  }

  async function handleAdjustStock() {
    const n = Number(newStock)
    if (newStock === '' || Number.isNaN(n)) {
      alertError('Stock inválido', 'Debe ser un número.'); return
    }
    setBusy(true)
    try {
      const updated = await booksApi.updateStock(current.id, {
        stockQuantity: n,
        reason: stockReason.trim() || null,
      })
      setCurrent(updated); onChanged(updated)
      setAdjustingStock(false); setNewStock(''); setStockReason('')
      toastSuccess('Stock actualizado')
    } catch (err) {
      alertError('No se pudo ajustar el stock', err instanceof Error ? err.message : undefined)
    } finally { setBusy(false) }
  }

  async function handleRemove(authorId: string, name: string) {
    const ok = await confirmAction({
      title: '¿Quitar autor del libro?', text: `${name} dejará de figurar como autor de "${current.name}".`,
      icon: 'warning', danger: true, confirmText: 'Sí, quitar',
    })
    if (!ok) return
    setBusy(true)
    try {
      await booksApi.removeAuthor(current.id, authorId)
      const updated = { ...current, authors: current.authors.filter(a => a.authorId !== authorId) }
      setCurrent(updated); onChanged(updated)
      toastSuccess('Autor quitado')
    } catch (err) {
      alertError('No se pudo quitar el autor', err instanceof Error ? err.message : undefined)
    } finally { setBusy(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="detail__header">
          <div className="detail__identity">
            <div className="detail__avatar"><BookIcon size={28} strokeWidth={1.4} /></div>
            <div>
              <div className="detail__name">{current.name}</div>
              <div className="detail__meta">
                {current.specialty && <span className="detail__moodle">{current.specialty}</span>}
              </div>
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>

        <div className="detail__body">
          <section className="detail__section">
            <h4 className="detail__section-title">Catálogo</h4>
            <dl className="detail__grid">
              <Row icon={Tag}    label="Código"     value={current.code} mono />
              <Row icon={Layers} label="Formato"    value={current.format} />
              <Row icon={Layers} label="Edición"    value={current.edition} />
              <Row icon={Hash}   label="Páginas"    value={current.pages != null ? String(current.pages) : null} />
              <Row icon={Layers} label="Sucursal"   value={current.branch} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Precios y stock</h4>
            <dl className="detail__grid">
              <Row icon={CircleDollarSign} label="Precio venta"     value={formatPrice(current.salePrice)} />
              <Row icon={Percent}          label="Descuento alumno" value={current.studentDiscountPct != null ? `${current.studentDiscountPct}%` : null} />
              <Row icon={CircleDollarSign} label="Costo unidad"     value={formatPrice(current.costPerUnit)} />
              <Row icon={Boxes}            label="Stock"            value={current.stockQuantity != null ? String(current.stockQuantity) : null} />
            </dl>

            {canWrite && (adjustingStock ? (
              <div className="book-authors__add">
                <input type="number" placeholder="Nuevo stock" value={newStock}
                  onChange={e => setNewStock(e.target.value)} disabled={busy} autoFocus />
                <input type="text" placeholder="Motivo (opcional)" value={stockReason}
                  onChange={e => setStockReason(e.target.value)} disabled={busy} maxLength={200} />
                <button type="button" className="btn-primary" disabled={busy} onClick={handleAdjustStock}>
                  <Save size={15} /> Guardar
                </button>
                <button type="button" className="btn-ghost" disabled={busy}
                  onClick={() => { setAdjustingStock(false); setNewStock(''); setStockReason('') }}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button type="button" className="btn-ghost btn-ghost--sm" disabled={busy}
                onClick={() => { setAdjustingStock(true); setNewStock(String(current.stockQuantity ?? 0)) }}>
                <Boxes size={13} /> Ajustar stock
              </button>
            ))}
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">
              <Users size={14} strokeWidth={1.8} /> Autores y autorías
              <span className={`detail__assigned ${assignedTotal > 100 ? 'detail__assigned--over' : ''}`}>
                {assignedTotal}% asignado
              </span>
            </h4>
            <p className="detail__notes" style={{ marginTop: '-0.25rem' }}>
              <strong>{current.royaltyPoolPct ?? 10}%</strong> de cada venta va al pool de autorías; los % de abajo reparten ese pool.
            </p>

            {current.authors.length === 0
              ? <p className="detail__notes">Sin autores asignados.</p>
              : (
                <ul className="book-authors">
                  {current.authors.map(a => (
                    <li key={a.authorId} className="book-authors__item">
                      <span className="book-authors__name">{a.lastName}, {a.firstName}</span>
                      <span className="book-authors__pct">{a.royaltyPercentage}%</span>
                      {canWrite && (
                        <button type="button" className="row-actions__btn row-actions__btn--danger" title="Quitar autor"
                          disabled={busy} onClick={() => handleRemove(a.authorId, `${a.firstName} ${a.lastName}`)}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

            {canWrite && (
              <div className="book-authors__add">
                <select value={addAuthorId} onChange={e => setAddAuthorId(e.target.value)} disabled={busy}>
                  <option value="">Agregar autor…</option>
                  {available.map(a => <option key={a.id} value={a.id}>{a.lastName}, {a.firstName}</option>)}
                </select>
                <input type="number" step="any" placeholder="% autoría"
                  value={addRoyalty} onChange={e => setAddRoyalty(e.target.value)} disabled={busy} />
                <button type="button" className="btn-primary" disabled={busy || !addAuthorId} onClick={handleAdd}>
                  <Plus size={15} /> Agregar
                </button>
              </div>
            )}

            {canWrite && (creating ? (
              <div className="book-authors__add">
                <input type="text" placeholder="Nombre" value={newFirst}
                  onChange={e => setNewFirst(e.target.value)} disabled={busy} />
                <input type="text" placeholder="Apellido" value={newLast}
                  onChange={e => setNewLast(e.target.value)} disabled={busy} />
                <button type="button" className="btn-primary" disabled={busy} onClick={handleCreateAuthor}>
                  <Plus size={15} /> Crear autora
                </button>
                <button type="button" className="btn-ghost" disabled={busy} onClick={() => setCreating(false)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button type="button" className="btn-ghost btn-ghost--sm" disabled={busy} onClick={() => setCreating(true)}>
                <Plus size={13} /> Crear autora nueva
              </button>
            ))}
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Sistema</h4>
            <dl className="detail__grid">
              <Row icon={Hash}     label="ID"   value={current.id} mono />
              <Row icon={Calendar} label="Alta" value={formatInstant(current.createdAt)} />
              <Row icon={Calendar} label="Última edición" value={formatInstant(current.updatedAt)} />
            </dl>
          </section>
        </div>

        <footer className="detail__footer">
          <button type="button" className="btn-ghost" onClick={onClose}>Cerrar</button>
          {canWrite && (
            <button type="button" className="btn-primary" onClick={onEdit}><Pencil size={15} /> Editar libro</button>
          )}
        </footer>
      </div>
    </div>
  )
}

function Row(props: { icon: LucideIcon; label: string; value: string | null | undefined; mono?: boolean }) {
  const Icon = props.icon
  return (
    <div className="detail__row">
      <div className="detail__row-label"><Icon size={14} strokeWidth={1.8} /> {props.label}</div>
      <div className={`detail__row-value ${props.mono ? 'mono' : ''}`}>
        {props.value ?? <span className="detail__empty">—</span>}
      </div>
    </div>
  )
}

function formatPrice(n: number | null | undefined): string | null {
  if (n == null) return null
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function formatInstant(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
