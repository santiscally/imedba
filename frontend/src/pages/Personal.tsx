import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  Users, Plus, ShieldCheck, Power, Trash2, X, Mail, UserCircle2, UserPlus, Download,
} from 'lucide-react'
import { usersApi } from '../api/users'
import type { AppUser, CreateUserRequest } from '../types/user'
import { roleLabel } from '../types/user'
import EmptyState from '../components/EmptyState'
import { confirmAction, alertError, toastSuccess } from '../lib/confirm'
import { exportToCsv, dateStamp } from '../lib/exportCsv'
import './Editorial.scss'
import '../components/StudentForm.scss'

// Módulo Personal: alta y gestión de usuarios de la app (viven en Keycloak). SOLO admin.
// La ruta /personal ya está gateada por `admin:manage` en lib/access.ts.
export default function Personal() {
  const [users,   setUsers]   = useState<AppUser[]>([])
  const [roles,   setRoles]   = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [reload,  setReload]  = useState(0)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    setLoading(true); setError(null)
    Promise.all([usersApi.list(), usersApi.roles()])
      .then(([us, rs]) => { setUsers(us); setRoles(rs); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [reload])

  function fullName(u: AppUser): string {
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username
  }

  async function handleToggleEnabled(u: AppUser) {
    const ok = await confirmAction({
      title: u.enabled ? '¿Desactivar usuario?' : '¿Reactivar usuario?',
      text:  u.enabled
        ? `${fullName(u)} no podrá iniciar sesión.`
        : `${fullName(u)} volverá a poder iniciar sesión.`,
      icon:  'warning', danger: u.enabled,
      confirmText: u.enabled ? 'Sí, desactivar' : 'Sí, reactivar',
    })
    if (!ok) return
    try {
      await usersApi.update(u.id, { enabled: !u.enabled })
      toastSuccess(u.enabled ? 'Usuario desactivado' : 'Usuario reactivado')
      setReload(r => r + 1)
    } catch (err) {
      alertError('No se pudo actualizar', err instanceof Error ? err.message : undefined)
    }
  }

  function handleExport() {
    if (!users.length) return
    exportToCsv(`personal-${dateStamp()}`, users, [
      { label: 'Usuario',  value: u => u.username },
      { label: 'Nombre',   value: u => u.firstName ?? '' },
      { label: 'Apellido', value: u => u.lastName ?? '' },
      { label: 'Email',    value: u => u.email ?? '' },
      { label: 'Roles',    value: u => u.roles.map(roleLabel).join(' | ') },
      { label: 'Activo',   value: u => u.enabled ? 'Sí' : 'No' },
    ])
  }

  async function handleDelete(u: AppUser) {
    const ok = await confirmAction({
      title: '¿Eliminar usuario?',
      text:  `${fullName(u)} se eliminará de Keycloak. Esta acción no se puede deshacer.`,
      icon:  'warning', danger: true, confirmText: 'Sí, eliminar',
    })
    if (!ok) return
    try {
      await usersApi.remove(u.id)
      toastSuccess('Usuario eliminado')
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
            <span className="editorial__title-icon"><Users size={22} strokeWidth={2} /></span>
            Personal
          </h2>
          <p className="editorial__subtitle">
            {users.length > 0
              ? `${users.length} ${users.length === 1 ? 'usuario' : 'usuarios'} del sistema`
              : 'Usuarios del sistema (acceso, contraseñas y roles)'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost" type="button" onClick={handleExport} disabled={!users.length}>
            <Download size={16} strokeWidth={2} /> Exportar
          </button>
          <button className="btn-primary" type="button" onClick={() => setCreating(true)}>
            <Plus size={16} strokeWidth={2.2} /> Nuevo usuario
          </button>
        </div>
      </header>

      <div className="editorial__table-wrap">
        {loading && <div className="editorial__loading">Cargando…</div>}
        {!loading && error && <EmptyState icon={Users} message="No se pudieron cargar los usuarios" hint={error} />}
        {!loading && !error && users.length === 0 && (
          <EmptyState icon={Users} message="Sin usuarios" hint="Creá el primer usuario del sistema." />
        )}
        {!loading && !error && users.length > 0 && (
          <table className="editorial-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="editorial-table__row">
                  <td>
                    <div className="ed-cell">
                      <div className="ed-cell__icon"><UserCircle2 size={24} strokeWidth={1.4} /></div>
                      <div><div className="ed-cell__name">{fullName(u)}</div></div>
                    </div>
                  </td>
                  <td>
                    {u.email
                      ? <a className="cell-inline" href={`mailto:${u.email}`}><Mail size={13} strokeWidth={1.8} />{u.email}</a>
                      : <span className="muted">—</span>}
                  </td>
                  <td>
                    <span className="cell-inline"><ShieldCheck size={13} strokeWidth={1.8} />
                      {u.roles.length > 0 ? u.roles.map(roleLabel).join(', ') : <span className="muted">sin rol</span>}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.enabled ? 'badge--activo' : 'badge--inactivo'}`}>
                      {u.enabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="col-acciones">
                    <div className="row-actions">
                      <button className="row-actions__btn" type="button"
                        title={u.enabled ? 'Desactivar' : 'Reactivar'}
                        onClick={() => handleToggleEnabled(u)}><Power size={16} /></button>
                      <button className="row-actions__btn row-actions__btn--danger" type="button" title="Eliminar"
                        onClick={() => handleDelete(u)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <CreateUserModal
          roles={roles}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); setReload(r => r + 1) }}
        />
      )}
    </div>
  )
}

function CreateUserModal(props: { roles: string[]; onClose: () => void; onCreated: () => void }) {
  const { roles, onClose, onCreated } = props
  const [form, setForm] = useState<CreateUserRequest>({
    email: '', firstName: '', lastName: '', password: '',
    role: roles[0] ?? 'VIEWER', temporaryPassword: false,
  })
  const [saving, setSaving]         = useState(false)
  const [submitError, setSubmitErr] = useState<string | null>(null)

  function set<K extends keyof CreateUserRequest>(key: K, value: CreateUserRequest[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (form.password.length < 6) { setSubmitErr('La contraseña debe tener al menos 6 caracteres'); return }
    setSaving(true); setSubmitErr(null)
    try {
      await usersApi.create({ ...form, email: form.email.trim() })
      toastSuccess('Usuario creado')
      onCreated()
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : 'No se pudo crear el usuario')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <div className="modal__title-wrap">
            <div className="modal__title-icon"><UserPlus size={18} /></div>
            <h3 className="modal__title">Nuevo usuario</h3>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="form__grid">
            <Field label="Nombre" required>
              <input type="text" value={form.firstName} autoFocus
                onChange={e => set('firstName', e.target.value)} required />
            </Field>
            <Field label="Apellido" required>
              <input type="text" value={form.lastName}
                onChange={e => set('lastName', e.target.value)} required />
            </Field>
            <Field label="Email" required>
              <input type="email" value={form.email}
                onChange={e => set('email', e.target.value)} required />
            </Field>
            <Field label="Contraseña (mín. 6)" required>
              <input type="text" value={form.password} minLength={6}
                onChange={e => set('password', e.target.value)} required />
            </Field>
            <Field label="Rol" required>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                {roles.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </Field>
            <div className="field field--full">
              <label className="field__check">
                <input type="checkbox" checked={form.temporaryPassword}
                  onChange={e => set('temporaryPassword', e.target.checked)} />
                <span>Pedir cambio de contraseña en el primer login</span>
              </label>
            </div>
          </div>

          {submitError && <div className="form__error">{submitError}</div>}

          <footer className="form__footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creando…' : 'Crear usuario'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function Field(props: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="field">
      <label className="field__label">
        {props.label}{props.required && <span className="field__required">*</span>}
      </label>
      {props.children}
    </div>
  )
}
