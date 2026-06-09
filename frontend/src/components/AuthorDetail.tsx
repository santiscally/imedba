import { X, Pencil, PenTool, UserCircle2, Mail, Phone, Hash, Calendar } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Author } from '../types/author'
import { hasAuthority } from '../lib/auth'
import './StudentDetail.scss'

interface Props {
  author:  Author
  onClose: () => void
  onEdit:  () => void
}

export default function AuthorDetail({ author, onClose, onEdit }: Props) {
  const canWrite = hasAuthority('authors:write')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="detail__header">
          <div className="detail__identity">
            <div className="detail__avatar"><PenTool size={28} strokeWidth={1.4} /></div>
            <div>
              <div className="detail__name">{author.lastName}, {author.firstName}</div>
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>

        <div className="detail__body">
          <section className="detail__section">
            <h4 className="detail__section-title">Contacto</h4>
            <dl className="detail__grid">
              <Row icon={UserCircle2} label="Nombre completo" value={`${author.firstName} ${author.lastName}`} />
              <Row icon={Mail}        label="Email"           value={author.email} />
              <Row icon={Phone}       label="Celular"         value={author.phone} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Sistema</h4>
            <dl className="detail__grid">
              <Row icon={Hash}     label="ID"             value={author.id} mono />
              <Row icon={Calendar} label="Alta"           value={formatInstant(author.createdAt)} />
              <Row icon={Calendar} label="Última edición" value={formatInstant(author.updatedAt)} />
            </dl>
          </section>
        </div>

        <footer className="detail__footer">
          <button type="button" className="btn-ghost" onClick={onClose}>Cerrar</button>
          {canWrite && (
            <button type="button" className="btn-primary" onClick={onEdit}>
              <Pencil size={15} /> Editar autor
            </button>
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

function formatInstant(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
