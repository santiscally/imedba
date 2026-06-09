import { useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, Library, Pencil, Trash2, ShoppingCart, BookCopy, X,
} from 'lucide-react'
import { collectionsApi } from '../api/collections'
import { studentsApi } from '../api/students'
import type { Collection } from '../types/collection'
import { COLLECTION_VARIANT_LABELS } from '../types/collection'
import type { Student } from '../types/student'
import EmptyState from '../components/EmptyState'
import CollectionForm from '../components/CollectionForm'
import { confirmAction, alertError, toastSuccess } from '../lib/confirm'
import { hasAuthority } from '../lib/auth'
import './Editorial.scss'

type Panel =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; collection: Collection }
  | { kind: 'sell'; collection: Collection }

export default function Colecciones() {
  const [items, setItems]     = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [reload, setReload]   = useState(0)

  const [query, setQuery]   = useState('')
  const [panel, setPanel]   = useState<Panel>({ kind: 'closed' })

  useEffect(() => {
    setLoading(true); setError(null)
    collectionsApi.list(true)
      .then(res => { setItems(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [reload])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(c => {
      if (q && !c.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, query])

  async function handleDelete(c: Collection) {
    const ok = await confirmAction({
      title: '¿Eliminar colección?', text: `"${c.name}" dejará de estar disponible para vender.`,
      icon: 'warning', danger: true, confirmText: 'Sí, eliminar',
    })
    if (!ok) return
    try {
      await collectionsApi.remove(c.id)
      toastSuccess('Colección eliminada')
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudo eliminar', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <div className="editorial">
      <header className="editorial__header">
        <div>
          <h2 className="editorial__title">
            <span className="editorial__title-icon"><Library size={22} strokeWidth={2} /></span>
            Colecciones
          </h2>
          <p className="editorial__subtitle">
            {items.length > 0
              ? `${items.length} ${items.length === 1 ? 'colección' : 'colecciones'}`
              : 'Colecciones de libros (anillada / tradicional)'}
          </p>
        </div>
        {hasAuthority('books:write') && (
          <button className="btn-primary" type="button" onClick={() => setPanel({ kind: 'create' })}>
            <Plus size={16} strokeWidth={2.2} /> Nueva colección
          </button>
        )}
      </header>

      <div className="editorial__toolbar">
        <div className="search">
          <Search size={16} strokeWidth={1.8} className="search__icon" />
          <input type="text" className="search__input" placeholder="Buscar colección…"
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="editorial__table-wrap">
        {loading && <div className="editorial__loading">Cargando…</div>}
        {!loading && error && <EmptyState icon={Library} message="No se pudieron cargar las colecciones" hint={error} />}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState icon={Library} message="Sin colecciones"
            hint={query ? `No hay colecciones para "${query}"` : 'Creá una colección agrupando libros.'} />
        )}
        {!loading && !error && filtered.length > 0 && (
          <table className="editorial-table">
            <thead>
              <tr>
                <th>Colección</th>
                <th>Variante</th>
                <th className="col-precio">Precio</th>
                <th className="col-num">Desc. alumno</th>
                <th className="col-num">Libros</th>
                <th className="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="editorial-table__row">
                  <td>
                    <div className="ed-cell">
                      <div className="ed-cell__icon"><BookCopy size={20} strokeWidth={1.5} /></div>
                      <div><div className="ed-cell__name">{c.name}</div></div>
                    </div>
                  </td>
                  <td>{COLLECTION_VARIANT_LABELS[c.variant]}</td>
                  <td className="col-precio"><span className="price">{formatPrice(c.price)}</span></td>
                  <td className="col-num">{c.studentDiscountPct}%</td>
                  <td className="col-num">{c.books.length}</td>
                  <td className="col-acciones">
                    <div className="row-actions">
                      {hasAuthority('book_sales:write') && (
                        <button className="row-actions__btn row-actions__btn--primary" type="button" title="Vender colección"
                          onClick={() => setPanel({ kind: 'sell', collection: c })}>
                          <ShoppingCart size={16} />
                        </button>
                      )}
                      {hasAuthority('books:write') && (
                        <>
                          <button className="row-actions__btn" type="button" title="Editar"
                            onClick={() => setPanel({ kind: 'edit', collection: c })}><Pencil size={16} /></button>
                          <button className="row-actions__btn row-actions__btn--danger" type="button" title="Eliminar"
                            onClick={() => handleDelete(c)}><Trash2 size={16} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {panel.kind === 'create' && (
        <CollectionForm mode="create"
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={() => { setPanel({ kind: 'closed' }); setReload(r => r + 1) }}
          onSubmit={(p) => collectionsApi.create(p)} />
      )}
      {panel.kind === 'edit' && (
        <CollectionForm mode="edit" initial={panel.collection}
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={() => { setPanel({ kind: 'closed' }); setReload(r => r + 1) }}
          onSubmit={(p) => collectionsApi.update(panel.collection.id, p)} />
      )}
      {panel.kind === 'sell' && (
        <SellModal collection={panel.collection}
          onClose={() => setPanel({ kind: 'closed' })}
          onSold={() => { setPanel({ kind: 'closed' }); setReload(r => r + 1) }} />
      )}
    </div>
  )
}

// ── Modal de venta de colección ────────────────────────────────────────────
function SellModal({ collection, onClose, onSold }: {
  collection: Collection
  onClose: () => void
  onSold: () => void
}) {
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState('')
  const [applyDiscount, setApplyDiscount] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    studentsApi.list({ size: 500, sort: 'lastName,asc' })
      .then(res => setStudents(res.content)).catch(() => setStudents([]))
  }, [])

  const net = applyDiscount
    ? Math.round(collection.price * (1 - collection.studentDiscountPct / 100))
    : collection.price

  async function handleSell() {
    setBusy(true); setError(null)
    try {
      const sales = await collectionsApi.sell(collection.id, {
        studentId: studentId || null,
        applyStudentDiscount: applyDiscount,
      })
      toastSuccess(`Colección vendida — ${sales.length} ${sales.length === 1 ? 'venta generada' : 'ventas generadas'}`)
      onSold()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo vender')
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><ShoppingCart size={18} /></div>
            <h3 className="modal__title">Vender colección</h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>
        <div className="form">
          <div className="form__hint">
            <strong>{collection.name}</strong> — {collection.books.length} libros. Se genera una venta
            por libro, repartiendo el precio proporcional al precio de lista de cada uno.
          </div>
          <div className="field field--full">
            <label className="field__label">Alumno (opcional)</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} disabled={busy}>
              <option value="">— Venta sin alumno —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.lastName}, {s.firstName}</option>)}
            </select>
          </div>
          <div className="field field--full">
            <label className="field__check">
              <input type="checkbox" checked={applyDiscount} onChange={e => setApplyDiscount(e.target.checked)} disabled={busy} />
              <span>Aplicar descuento alumno ({collection.studentDiscountPct}%)</span>
            </label>
          </div>
          <div className="form__hint">
            Total a cobrar: <strong>{formatPrice(net)}</strong>
            {applyDiscount && <> (precio de lista {formatPrice(collection.price)})</>}
          </div>
          {error && <div className="form__error">{error}</div>}
          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={handleSell} disabled={busy}>
              {busy ? 'Vendiendo…' : 'Confirmar venta'}
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}

function formatPrice(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}
