import { X, ShoppingBag, Book as BookIcon, Hash, Calendar, CircleDollarSign, Boxes, FileText, GraduationCap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { BookSale } from '../types/book-sale'
import './StudentDetail.scss'

interface Props {
  sale:    BookSale
  onClose: () => void
}

export default function BookSaleDetail({ sale, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="detail__header">
          <div className="detail__identity">
            <div className="detail__avatar"><ShoppingBag size={28} strokeWidth={1.4} /></div>
            <div>
              <div className="detail__name">{sale.bookName ?? 'Venta'}</div>
              <div className="detail__meta">
                <span className="badge badge--activo">{formatPrice(sale.totalAmount)}</span>
                {sale.studentSale && <span className="detail__moodle">Venta a alumno</span>}
              </div>
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>

        <div className="detail__body">
          <section className="detail__section">
            <h4 className="detail__section-title">Venta</h4>
            <dl className="detail__grid">
              <Row icon={BookIcon}         label="Libro"          value={sale.bookName} />
              <Row icon={Boxes}            label="Cantidad"       value={String(sale.quantity)} />
              <Row icon={CircleDollarSign} label="Precio unitario" value={formatPrice(sale.unitPrice)} />
              <Row icon={CircleDollarSign} label="Total"          value={formatPrice(sale.totalAmount)} />
              <Row icon={GraduationCap}    label="Tipo"           value={sale.studentSale ? 'Con descuento de alumno' : 'Precio de lista'} />
              <Row icon={Calendar}         label="Fecha"          value={formatInstant(sale.saleDate)} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Sistema</h4>
            <dl className="detail__grid">
              <Row icon={Hash}     label="ID venta"      value={sale.id} mono />
              <Row icon={Hash}     label="ID libro"      value={sale.bookId} mono />
              <Row icon={Hash}     label="ID alumno"     value={sale.studentId} mono />
              <Row icon={Hash}     label="ID inscripción" value={sale.enrollmentId} mono />
              <Row icon={Calendar} label="Alta"          value={formatInstant(sale.createdAt)} />
            </dl>
          </section>

          {sale.notes && (
            <section className="detail__section">
              <h4 className="detail__section-title"><FileText size={14} strokeWidth={1.8} /> Observaciones</h4>
              <p className="detail__notes">{sale.notes}</p>
            </section>
          )}
        </div>

        <footer className="detail__footer">
          <button type="button" className="btn-ghost" onClick={onClose}>Cerrar</button>
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

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function formatInstant(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
