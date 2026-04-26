import {
  X, Pencil, UserCircle2, Building2, Mail, Phone, Briefcase,
  Hash, Calendar, FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Contact } from '../types/contact'
import { CONTACT_TYPE_LABELS } from '../types/contact'
import './StudentDetail.scss'

interface Props {
  contact: Contact
  onClose: () => void
  onEdit:  () => void
}

export default function ContactDetail({ contact, onClose, onEdit }: Props) {
  const isEmpleado = contact.contactType === 'EMPLEADO'
  const displayName = isEmpleado
    ? `${contact.lastName ?? ''}, ${contact.firstName ?? ''}`.replace(/^, |, $/, '')
    : (contact.companyName ?? '—')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="detail"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="detail__header">
          <div className="detail__identity">
            <div className="detail__avatar">
              {isEmpleado
                ? <UserCircle2 size={32} strokeWidth={1.4} />
                : <Building2   size={32} strokeWidth={1.4} />}
            </div>
            <div>
              <div className="detail__name">{displayName}</div>
              <div className="detail__meta">
                <span className={`badge ${isEmpleado ? 'badge--activo' : 'badge--pendiente'}`}>
                  {CONTACT_TYPE_LABELS[contact.contactType]}
                </span>
                <span className={`badge ${contact.active ? 'badge--activo' : 'badge--inactivo'}`}>
                  {contact.active ? 'Activo' : 'Inactivo'}
                </span>
                {contact.roleDescription && (
                  <span className="detail__moodle">{contact.roleDescription}</span>
                )}
              </div>
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="detail__body">
          <section className="detail__section">
            <h4 className="detail__section-title">Identificación</h4>
            <dl className="detail__grid">
              {isEmpleado ? (
                <>
                  <Row icon={UserCircle2} label="Nombre"   value={contact.firstName} />
                  <Row icon={UserCircle2} label="Apellido" value={contact.lastName} />
                </>
              ) : (
                <Row icon={Building2} label="Razón social" value={contact.companyName} />
              )}
              <Row icon={Briefcase} label={isEmpleado ? 'Rol / cargo' : 'Servicio'} value={contact.roleDescription} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Contacto</h4>
            <dl className="detail__grid">
              <Row icon={Mail}  label="Email"    value={contact.email} />
              <Row icon={Phone} label="Teléfono" value={contact.phone} />
            </dl>
          </section>

          <section className="detail__section">
            <h4 className="detail__section-title">Sistema</h4>
            <dl className="detail__grid">
              <Row icon={Hash}     label="ID"             value={contact.id} mono />
              <Row icon={Hash}     label="Keycloak user"  value={contact.keycloakUserId} mono />
              <Row icon={Calendar} label="Alta"           value={formatInstant(contact.createdAt)} />
              <Row icon={Calendar} label="Última edición" value={formatInstant(contact.updatedAt)} />
            </dl>
          </section>

          {contact.notes && (
            <section className="detail__section">
              <h4 className="detail__section-title">
                <FileText size={14} strokeWidth={1.8} /> Notas
              </h4>
              <p className="detail__notes">{contact.notes}</p>
            </section>
          )}
        </div>

        <footer className="detail__footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="btn-primary" onClick={onEdit}>
            <Pencil size={15} /> Editar contacto
          </button>
        </footer>
      </div>
    </div>
  )
}

function Row(props: {
  icon:  LucideIcon
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  const Icon = props.icon
  return (
    <div className="detail__row">
      <div className="detail__row-label">
        <Icon size={14} strokeWidth={1.8} /> {props.label}
      </div>
      <div className={`detail__row-value ${props.mono ? 'mono' : ''}`}>
        {props.value ?? <span className="detail__empty">—</span>}
      </div>
    </div>
  )
}

function formatInstant(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
