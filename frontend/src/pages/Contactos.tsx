import { useEffect, useState } from 'react'
import {
  Search, Plus, ChevronLeft, ChevronRight,
  Contact as ContactIcon, ArrowUp, ArrowDown, ArrowUpDown,
  UserCircle2, Building2, Mail, Phone,
  Eye, Pencil, PowerOff,
} from 'lucide-react'
import { contactsApi } from '../api/contacts'
import type { PageResponse } from '../types/common'
import type { Contact, ContactType, ContactCreateRequest } from '../types/contact'
import { CONTACT_TYPE_LABELS } from '../types/contact'
import EmptyState from '../components/EmptyState'
import ContactForm from '../components/ContactForm'
import ContactDetail from '../components/ContactDetail'
import './Contactos.scss'

const PAGE_SIZE = 10

type SortDir   = 'asc' | 'desc'
type SortField = 'lastName' | 'companyName' | 'contactType' | 'email' | 'active'
type SortState = { field: SortField; dir: SortDir } | null

type TypeFilter = ContactType | 'TODOS'
type ActiveFilter = 'TODOS' | 'ACTIVOS' | 'INACTIVOS'

type PanelState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit';   contact: Contact }
  | { kind: 'detail'; contact: Contact }

export default function Contactos() {
  const [query,        setQuery]        = useState('')
  const [debounced,    setDebounced]    = useState('')
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>('TODOS')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('TODOS')
  const [page,         setPage]         = useState(0)
  const [sort,         setSort]         = useState<SortState>({ field: 'lastName', dir: 'asc' })

  const [data,    setData]    = useState<PageResponse<Contact> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [reload,  setReload]  = useState(0)

  const [panel, setPanel] = useState<PanelState>({ kind: 'closed' })

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setLoading(true); setError(null)
    contactsApi.list({
      q:      debounced || undefined,
      type:   typeFilter === 'TODOS' ? undefined : typeFilter,
      active: activeFilter === 'TODOS' ? undefined : activeFilter === 'ACTIVOS',
      page,
      size:   PAGE_SIZE,
      sort:   sort ? `${sort.field},${sort.dir}` : undefined,
    })
      .then(res => { setData(res); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [debounced, typeFilter, activeFilter, page, sort, reload])

  const total      = data?.totalElements ?? 0
  const totalPages = data?.totalPages    ?? 0
  const items      = data?.content       ?? []

  function toggleSort(field: SortField) {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc')             return { field, dir: 'desc' }
      return null
    })
    setPage(0)
  }

  function handleSaved() {
    setPanel({ kind: 'closed' })
    setReload(r => r + 1)
  }

  async function handleDeactivate(c: Contact) {
    const label = c.contactType === 'EMPLEADO'
      ? `${c.lastName ?? ''}, ${c.firstName ?? ''}`.replace(/^, |, $/, '')
      : c.companyName ?? '—'
    if (!window.confirm(`¿Desactivar a "${label}"?\nPodés volver a activarlo editándolo.`)) return
    try {
      await contactsApi.deactivate(c.id)
      setReload(r => r + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desactivar')
    }
  }

  return (
    <div className="contactos">
      <header className="contactos__header">
        <div className="contactos__header-text">
          <h2 className="contactos__title">
            <span className="contactos__title-icon"><ContactIcon size={22} strokeWidth={2} /></span>
            Contactos
          </h2>
          <p className="contactos__subtitle">
            {total > 0
              ? `${total} ${total === 1 ? 'contacto registrado' : 'contactos registrados'}`
              : 'Empleados, docentes externos y proveedores del instituto'}
          </p>
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={() => setPanel({ kind: 'create' })}
        >
          <Plus size={16} strokeWidth={2.2} /> Nuevo contacto
        </button>
      </header>

      <div className="contactos__toolbar">
        <div className="search">
          <Search size={16} strokeWidth={1.8} className="search__icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, razón social, email o rol…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search__input"
          />
        </div>

        <div className="contactos__chips">
          {(['TODOS', 'EMPLEADO', 'PROVEEDOR'] as TypeFilter[]).map(opt => (
            <button
              key={opt}
              type="button"
              className={`chip ${typeFilter === opt ? 'chip--active' : ''}`}
              onClick={() => { setTypeFilter(opt); setPage(0) }}
            >
              {opt === 'TODOS' ? 'Todos' : CONTACT_TYPE_LABELS[opt]}
            </button>
          ))}
          <span className="chip-sep" />
          {(['TODOS', 'ACTIVOS', 'INACTIVOS'] as ActiveFilter[]).map(opt => (
            <button
              key={opt}
              type="button"
              className={`chip ${activeFilter === opt ? 'chip--active' : ''}`}
              onClick={() => { setActiveFilter(opt); setPage(0) }}
            >
              {opt === 'TODOS' ? 'Todos' : opt === 'ACTIVOS' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>
      </div>

      <div className="contactos__table-wrap">
        {loading && <div className="contactos__loading">Cargando…</div>}

        {!loading && error && (
          <EmptyState
            icon={ContactIcon}
            message="No se pudieron cargar los contactos"
            hint={error}
          />
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            icon={ContactIcon}
            message="Sin resultados"
            hint={debounced ? `No hay contactos para "${debounced}"` : 'No hay contactos cargados.'}
          />
        )}

        {!loading && !error && items.length > 0 && (
          <table className="contactos-table">
            <thead>
              <tr>
                <SortableTh
                  label="Nombre"
                  field="lastName"
                  sort={sort}
                  onClick={() => toggleSort('lastName')}
                />
                <SortableTh
                  label="Tipo"
                  field="contactType"
                  sort={sort}
                  onClick={() => toggleSort('contactType')}
                  className="col-tipo"
                />
                <th className="col-rol">Rol / servicio</th>
                <SortableTh
                  label="Email"
                  field="email"
                  sort={sort}
                  onClick={() => toggleSort('email')}
                  className="col-contact"
                />
                <th className="col-contact">Teléfono</th>
                <SortableTh
                  label="Estado"
                  field="active"
                  sort={sort}
                  onClick={() => toggleSort('active')}
                  className="col-estado"
                />
                <th className="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => {
                const isEmp = c.contactType === 'EMPLEADO'
                const name = isEmp
                  ? `${c.lastName ?? ''}, ${c.firstName ?? ''}`.replace(/^, |, $/, '')
                  : c.companyName ?? '—'
                return (
                  <tr key={c.id} className="contactos-table__row">
                    <td>
                      <div className="contact-cell">
                        <div className={`contact-cell__avatar ${isEmp ? 'is-emp' : 'is-prov'}`}>
                          {isEmp
                            ? <UserCircle2 size={26} strokeWidth={1.4} />
                            : <Building2   size={22} strokeWidth={1.5} />}
                        </div>
                        <div>
                          <div className="contact-cell__name">{name}</div>
                          {isEmp && c.companyName && (
                            <div className="contact-cell__sub">{c.companyName}</div>
                          )}
                          {!isEmp && c.firstName && c.lastName && (
                            <div className="contact-cell__sub">{c.firstName} {c.lastName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="col-tipo">
                      <span className={`pill pill--${c.contactType.toLowerCase()}`}>
                        {CONTACT_TYPE_LABELS[c.contactType]}
                      </span>
                    </td>
                    <td className="col-rol">
                      {c.roleDescription
                        ? <span className="role-text">{c.roleDescription}</span>
                        : <span className="muted">—</span>}
                    </td>
                    <td className="col-contact">
                      {c.email
                        ? <a href={`mailto:${c.email}`} className="cell-inline contact-link">
                            <Mail size={13} strokeWidth={1.8} />{c.email}
                          </a>
                        : <span className="muted">—</span>}
                    </td>
                    <td className="col-contact">
                      {c.phone
                        ? <span className="cell-inline">
                            <Phone size={13} strokeWidth={1.8} />{c.phone}
                          </span>
                        : <span className="muted">—</span>}
                    </td>
                    <td className="col-estado">
                      <span className={`badge ${c.active ? 'badge--activo' : 'badge--inactivo'}`}>
                        {c.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="col-acciones">
                      <div className="row-actions">
                        <button
                          className="row-actions__btn"
                          type="button"
                          onClick={() => setPanel({ kind: 'detail', contact: c })}
                          aria-label="Ver detalle"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="row-actions__btn"
                          type="button"
                          onClick={() => setPanel({ kind: 'edit', contact: c })}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        {c.active && (
                          <button
                            className="row-actions__btn"
                            type="button"
                            onClick={() => handleDeactivate(c)}
                            aria-label="Desactivar"
                            title="Desactivar"
                          >
                            <PowerOff size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && !error && totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          first={data?.first ?? true}
          last={data?.last ?? true}
          onChange={setPage}
        />
      )}

      {panel.kind === 'create' && (
        <ContactForm
          mode="create"
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handleSaved}
          onSubmit={(payload: ContactCreateRequest) => contactsApi.create(payload)}
        />
      )}
      {panel.kind === 'edit' && (
        <ContactForm
          mode="edit"
          initial={panel.contact}
          onClose={() => setPanel({ kind: 'closed' })}
          onSaved={handleSaved}
          onSubmit={(payload) => contactsApi.update(panel.contact.id, payload)}
        />
      )}
      {panel.kind === 'detail' && (
        <ContactDetail
          contact={panel.contact}
          onClose={() => setPanel({ kind: 'closed' })}
          onEdit={() => setPanel({ kind: 'edit', contact: panel.contact })}
        />
      )}
    </div>
  )
}

function SortableTh(props: {
  label:     string
  field:     SortField
  sort:      SortState
  onClick:   () => void
  className?: string
}) {
  const { label, field, sort, onClick, className } = props
  const isActive = sort?.field === field
  const dir      = isActive ? sort.dir : null

  return (
    <th
      onClick={onClick}
      className={`th-sortable ${isActive ? 'th-sortable--active' : ''} ${className ?? ''}`}
    >
      <span className="th-sortable__label">
        {label}
        <span className="th-sortable__icon">
          {dir === 'asc'  && <ArrowUp size={13} strokeWidth={2.2} />}
          {dir === 'desc' && <ArrowDown size={13} strokeWidth={2.2} />}
          {dir === null   && <ArrowUpDown size={13} strokeWidth={1.8} />}
        </span>
      </span>
    </th>
  )
}

function Pagination(props: {
  page:       number
  totalPages: number
  first:      boolean
  last:       boolean
  onChange:   (page: number) => void
}) {
  const { page, totalPages, first, last, onChange } = props
  const pageNumbers = buildPageNumbers(page, totalPages)

  return (
    <nav className="pager" aria-label="Paginación">
      <button
        className="pager__btn pager__btn--nav"
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={first}
        type="button"
      >
        <ChevronLeft size={18} strokeWidth={2.2} />
        <span>Anterior</span>
      </button>

      <div className="pager__numbers">
        {pageNumbers.map((n, i) =>
          n === '…' ? (
            <span key={`dots-${i}`} className="pager__dots">…</span>
          ) : (
            <button
              key={n}
              type="button"
              className={`pager__num ${n === page ? 'pager__num--active' : ''}`}
              onClick={() => onChange(n)}
            >
              {n + 1}
            </button>
          ),
        )}
      </div>

      <button
        className="pager__btn pager__btn--nav"
        onClick={() => onChange(page + 1)}
        disabled={last}
        type="button"
      >
        <span>Siguiente</span>
        <ChevronRight size={18} strokeWidth={2.2} />
      </button>
    </nav>
  )
}

function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const pages: (number | '…')[] = []
  pages.push(0)
  if (current > 2) pages.push('…')
  const start = Math.max(1, current - 1)
  const end   = Math.min(total - 2, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 3) pages.push('…')
  pages.push(total - 1)
  return pages
}
