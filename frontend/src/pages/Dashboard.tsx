import { useEffect, useMemo, useState } from 'react'
import {
  Users, BookOpen, Wallet, FileSignature,
  Plus, CreditCard, UserPlus,
  ArrowRight, ArrowUp, ArrowDown, Clock, AlertCircle,
  Banknote, ShoppingBag,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { budgetApi } from '../api/budget'
import { studentsApi } from '../api/students'
import { enrollmentsApi } from '../api/enrollments'
import { bookSalesApi } from '../api/book-sales'
import { installmentsApi } from '../api/installments'
import { dashboardApi } from '../api/dashboard'
import { currentUser, hasAuthority } from '../lib/auth'
import './Dashboard.scss'

// Dashboard — refuerzo positivo arriba, operativo abajo (reunión 22-05 §2.9).
// Las 4 cards de refuerzo (ingresos del mes + delta, alumnos nuevos del mes,
// inscripciones del mes, libro top del mes) se componen client-side porque
// `/dashboard/summary` solo expone totales del sistema. Actividad y vencidas
// usan los endpoints reales (`/dashboard/activity`, `/installments/overdue`).

// ─── Tipos de UI ─────────────────────────────────────────────────────────────
type Stat<T> =
  | { status: 'loading' }
  | { status: 'hidden' }
  | { status: 'error' }
  | { status: 'ok'; data: T }

interface IncomeData    { current: number; previous: number }
interface TopBookData   { name: string; quantity: number }
interface OverdueRow    { id: string; alumno: string; curso: string; cuotaNumero: number; cuotaTotal: number; diasVencidos: number; monto: number }
interface ActivityRow   { id: string; type: string; title: string; detail: string; amount: number | null; date: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const MONTHS_ES_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const fmtCurrency = (n: number) => `$${new Intl.NumberFormat('es-AR').format(Math.round(n))}`
const fmtNumber   = (n: number) => new Intl.NumberFormat('es-AR').format(n)

function monthLabel(year: number, month: number): string {
  return `${MONTHS_ES[month - 1]} ${year}`
}

function monthInstantStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`
}

function monthInstantEnd(year: number, month: number): string {
  const last = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}T23:59:59Z`
}

function inMonth(iso: string | null, year: number, month: number): boolean {
  if (!iso) return false
  return iso.startsWith(`${year}-${String(month).padStart(2, '0')}`)
}

function prevMonth(p: { year: number; month: number }) {
  return p.month === 1 ? { year: p.year - 1, month: 12 } : { year: p.year, month: p.month - 1 }
}

function firstName(name: string | null | undefined): string {
  if (!name) return ''
  return name.split(' ')[0]
}

function timeOfDayGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

// Iniciales para avatar (Apellido, Nombre → AN)
function initials(name: string): string {
  const parts = name.replace(',', '').trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Color del badge de días vencidos según severidad
function overdueSeverity(days: number): 'leve' | 'medio' | 'critico' {
  if (days <= 20) return 'leve'
  if (days <= 40) return 'medio'
  return 'critico'
}

function fmtShortInstant(iso: string): string {
  const dt = new Date(iso)
  return `${dt.getDate()} ${MONTHS_ES_SHORT[dt.getMonth()]}`
}


// ─── Quick actions ───────────────────────────────────────────────────────────
const QUICK_ACTIONS: Array<{ icon: LucideIcon; label: string; desc: string; to: string; need: string }> = [
  { icon: UserPlus,   label: 'Nueva inscripción', desc: 'Inscribir alumno en curso', to: '/inscripciones', need: 'enrollments:write' },
  { icon: CreditCard, label: 'Registrar pago',    desc: 'Cobrar cuota',              to: '/cuotas',        need: 'payments:write' },
  { icon: Plus,       label: 'Nuevo alumno',      desc: 'Dar de alta',               to: '/alumnos',       need: 'students:write' },
]

// ─── Componente ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const user = currentUser()

  const today = useMemo(() => new Date(), [])
  const cur = useMemo(() => ({ year: today.getFullYear(), month: today.getMonth() + 1 }), [today])
  const prev = useMemo(() => prevMonth(cur), [cur])

  // ─── Estado por tarjeta ──────────────────────────────────────────────────
  const [income,         setIncome]         = useState<Stat<IncomeData>>({ status: 'loading' })
  const [newStudents,    setNewStudents]    = useState<Stat<number>>({ status: 'loading' })
  const [newEnrollments, setNewEnrollments] = useState<Stat<number>>({ status: 'loading' })
  const [topBook,        setTopBook]        = useState<Stat<TopBookData>>({ status: 'loading' })
  const [overdue,        setOverdue]        = useState<Stat<OverdueRow[]>>({ status: 'loading' })
  const [activity,       setActivity]       = useState<Stat<ActivityRow[]>>({ status: 'loading' })

  // ─── Carga en paralelo ───────────────────────────────────────────────────
  useEffect(() => {
    // Ingresos: mes actual vs anterior
    if (!hasAuthority('budget:read')) {
      setIncome({ status: 'hidden' })
    } else {
      Promise.all([
        budgetApi.summary(cur.year, cur.month),
        budgetApi.summary(prev.year, prev.month),
      ])
        .then(([c, p]) => setIncome({ status: 'ok', data: { current: c.totalIncome, previous: p.totalIncome } }))
        .catch(() => setIncome({ status: 'error' }))
    }

    // Alumnos nuevos del mes (fetch sorted desc por createdAt, filter client-side)
    if (!hasAuthority('students:read')) {
      setNewStudents({ status: 'hidden' })
    } else {
      studentsApi.list({ size: 100, sort: 'createdAt,desc' })
        .then(r => setNewStudents({ status: 'ok', data: r.content.filter(s => inMonth(s.createdAt, cur.year, cur.month)).length }))
        .catch(() => setNewStudents({ status: 'error' }))
    }

    // Inscripciones del mes
    if (!hasAuthority('enrollments:read')) {
      setNewEnrollments({ status: 'hidden' })
    } else {
      enrollmentsApi.list({ size: 100, sort: 'enrollmentDate,desc' })
        .then(r => setNewEnrollments({ status: 'ok', data: r.content.filter(e => inMonth(e.enrollmentDate, cur.year, cur.month)).length }))
        .catch(() => setNewEnrollments({ status: 'error' }))
    }

    // Libro más vendido del mes (agrupado client-side por nombre)
    if (!hasAuthority('book_sales:read')) {
      setTopBook({ status: 'hidden' })
    } else {
      bookSalesApi.list({
        size: 200,
        sort: 'saleDate,desc',
        from: monthInstantStart(cur.year, cur.month),
        to:   monthInstantEnd(cur.year, cur.month),
      })
        .then(r => {
          if (r.content.length === 0) { setTopBook({ status: 'ok', data: { name: '—', quantity: 0 } }); return }
          const tally = new Map<string, number>()
          for (const s of r.content) {
            const key = s.bookName ?? '(sin nombre)'
            tally.set(key, (tally.get(key) ?? 0) + s.quantity)
          }
          let best: TopBookData = { name: '—', quantity: 0 }
          for (const [name, quantity] of tally) {
            if (quantity > best.quantity) best = { name, quantity }
          }
          setTopBook({ status: 'ok', data: best })
        })
        .catch(() => setTopBook({ status: 'error' }))
    }

    // Cuotas vencidas — GET /installments/overdue (status=OVERDUE && diasVencidos > 10)
    if (!hasAuthority('installments:read')) {
      setOverdue({ status: 'hidden' })
    } else {
      installmentsApi.overdue()
        .then(rows => {
          const data: OverdueRow[] = rows.slice(0, 10).map(r => ({
            id:           r.id,
            alumno:       r.alumno,
            curso:        r.curso,
            cuotaNumero:  r.cuotaNumero,
            cuotaTotal:   r.cuotaTotal,
            diasVencidos: r.diasVencidos,
            monto:        r.monto,
          }))
          setOverdue({ status: 'ok', data })
        })
        .catch(() => setOverdue({ status: 'error' }))
    }

    // Actividad reciente — GET /dashboard/activity (merge top-8 server-side).
    // Auth: students:read (es info agregada, sin datos sensibles).
    if (!hasAuthority('students:read')) {
      setActivity({ status: 'hidden' })
    } else {
      dashboardApi.activity()
        .then(items => setActivity({ status: 'ok', data: items }))
        .catch(() => setActivity({ status: 'error' }))
    }
  }, [cur.year, cur.month, prev.year, prev.month])

  // ─── Render helpers ──────────────────────────────────────────────────────
  function renderIncome() {
    if (income.status === 'hidden') return null
    return (
      <StatCard icon={Wallet} tone="primary" label="Ingresos del mes" loading={income.status === 'loading'} error={income.status === 'error'}>
        {income.status === 'ok' && (
          income.data.current === 0
            ? <div className="stat-card__value-text muted">Aún sin ingresos este mes</div>
            : (
              <>
                <div className="stat-card__value">{fmtCurrency(income.data.current)}</div>
                <Delta current={income.data.current} previous={income.data.previous} prevLabel={MONTHS_ES[prev.month - 1]} />
              </>
            )
        )}
      </StatCard>
    )
  }

  function renderNewStudents() {
    if (newStudents.status === 'hidden') return null
    return (
      <StatCard
        icon={Users} tone="azul" label="Alumnos nuevos del mes"
        loading={newStudents.status === 'loading'} error={newStudents.status === 'error'}
        onClick={() => navigate('/alumnos')}
      >
        {newStudents.status === 'ok' && <div className="stat-card__value">{fmtNumber(newStudents.data)}</div>}
      </StatCard>
    )
  }

  function renderNewEnrollments() {
    if (newEnrollments.status === 'hidden') return null
    return (
      <StatCard
        icon={FileSignature} tone="verde" label="Inscripciones del mes"
        loading={newEnrollments.status === 'loading'} error={newEnrollments.status === 'error'}
        onClick={() => navigate('/inscripciones')}
      >
        {newEnrollments.status === 'ok' && <div className="stat-card__value">{fmtNumber(newEnrollments.data)}</div>}
      </StatCard>
    )
  }

  function renderTopBook() {
    if (topBook.status === 'hidden') return null
    return (
      <StatCard
        icon={BookOpen} tone="primary" label="Libro top del mes"
        loading={topBook.status === 'loading'} error={topBook.status === 'error'}
        onClick={() => navigate('/libros')}
      >
        {topBook.status === 'ok' && (
          topBook.data.quantity === 0
            ? <div className="stat-card__value-text muted">Sin ventas</div>
            : (
              <>
                <div className="stat-card__value-text" title={topBook.data.name}>{topBook.data.name}</div>
                <div className="stat-card__sub">{topBook.data.quantity} {topBook.data.quantity === 1 ? 'unidad vendida' : 'unidades vendidas'}</div>
              </>
            )
        )}
      </StatCard>
    )
  }

  return (
    <div className="dashboard">

      {/* SALUDO */}
      <header className="dashboard__greeting">
        <div className="dashboard__greeting-text">
          <p className="dashboard__hello-sub">{timeOfDayGreeting()},</p>
          <h1 className="dashboard__hello">
            {user?.fullName ? firstName(user.fullName) : 'IMEDBA'}
            <span className="dashboard__wave">👋</span>
          </h1>
          <p className="dashboard__period">Resumen de <strong>{monthLabel(cur.year, cur.month)}</strong></p>
        </div>
        <div className="dashboard__greeting-pill">
          <span className="dashboard__greeting-pill-label">Hoy</span>
          <span className="dashboard__greeting-pill-value">
            {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long' })}
          </span>
        </div>
      </header>

      {/* STATS POSITIVAS */}
      <section className="stats-grid">
        {renderIncome()}
        {renderNewStudents()}
        {renderNewEnrollments()}
        {renderTopBook()}
      </section>

      {/* QUICK ACTIONS */}
      <section className="section">
        <div className="section__header"><h2 className="section__title">Accesos rápidos</h2></div>
        <div className="quick-actions">
          {QUICK_ACTIONS.filter(a => hasAuthority(a.need)).map(action => {
            const Icon = action.icon
            return (
              <button className="quick-action" key={action.label} onClick={() => navigate(action.to)}>
                <div className="quick-action__icon"><Icon size={20} strokeWidth={2} /></div>
                <div className="quick-action__text">
                  <div className="quick-action__label">{action.label}</div>
                  <div className="quick-action__desc">{action.desc}</div>
                </div>
                <ArrowRight size={16} className="quick-action__arrow" />
              </button>
            )
          })}
        </div>
      </section>

      {/* CUOTAS VENCIDAS */}
      {overdue.status !== 'hidden' && (
        <section className="section">
          <div className="section__header">
            <h2 className="section__title">
              <AlertCircle size={16} className="section__title-icon" />
              Cuotas vencidas (más de 10 días)
            </h2>
            {overdue.status === 'ok' && overdue.data.length > 0 && (
              <button className="section__action" onClick={() => navigate('/cuotas')}>Ver todas</button>
            )}
          </div>

          {overdue.status === 'loading' ? (
            <div className="loading-block">Cargando...</div>
          ) : overdue.status === 'error' || (overdue.status === 'ok' && overdue.data.length === 0) ? (
            <div className="dashboard__empty">No hay cuotas vencidas. 🎉</div>
          ) : overdue.status === 'ok' ? (
            <div className="alerts-card">
              {overdue.data.map(r => {
                const cuotaLabel = r.cuotaNumero === 0
                  ? 'Matrícula'
                  : `Cuota ${r.cuotaNumero}/${r.cuotaTotal}`
                const severity = overdueSeverity(r.diasVencidos)
                return (
                  <div className={`alert-row${r.diasVencidos >= 45 ? ' alert-row--severe' : ''}`} key={r.id}>
                    <div className="alert-row__avatar">{initials(r.alumno)}</div>
                    <div className="alert-row__main">
                      <div className="alert-row__alumno">{r.alumno}</div>
                      <div className="alert-row__meta">
                        {r.curso} · {cuotaLabel}
                      </div>
                    </div>
                    <div className="alert-row__monto">{fmtCurrency(r.monto)}</div>
                    <div className={`alert-row__dias alert-row__dias--${severity}`}>
                      <Clock size={12} />
                      {r.diasVencidos} días
                    </div>
                    <button className="alert-row__btn" onClick={() => navigate('/cuotas')}>Gestionar</button>
                  </div>
                )
              })}
            </div>
          ) : null}
        </section>
      )}

      {/* ACTIVIDAD RECIENTE */}
      {activity.status !== 'hidden' && (
        <section className="section">
          <div className="section__header"><h2 className="section__title">Actividad reciente</h2></div>

          {activity.status === 'loading' ? (
            <div className="loading-block">Cargando...</div>
          ) : activity.status === 'error' || (activity.status === 'ok' && activity.data.length === 0) ? (
            <div className="dashboard__empty">Sin movimientos recientes.</div>
          ) : activity.status === 'ok' ? (
            <div className="activity-card">
              {activity.data.map(a => {
                const tone = a.type === 'payment' ? 'verde'
                  : a.type === 'enrollment' ? 'azul'
                  : 'violeta'
                const Icon = a.type === 'payment' ? Banknote
                  : a.type === 'enrollment' ? UserPlus
                  : ShoppingBag
                return (
                  <div className="activity-row" key={a.id}>
                    <div className={`activity-row__icon activity-row__icon--${tone}`}>
                      <Icon size={15} strokeWidth={2} />
                    </div>
                    <div className="activity-row__content">
                      <div className="activity-row__text">
                        <strong>{a.title}</strong> — {a.detail}
                        {a.amount != null && ` · ${fmtCurrency(a.amount)}`}
                      </div>
                      <div className="activity-row__time">{fmtShortInstant(a.date)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </section>
      )}

    </div>
  )
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────
interface StatCardProps {
  icon: LucideIcon
  tone: 'azul' | 'rojo' | 'verde' | 'primary'
  label: string
  loading: boolean
  error: boolean
  onClick?: () => void
  children?: React.ReactNode
}

function StatCard({ icon: Icon, tone, label, loading, error, onClick, children }: StatCardProps) {
  const Tag = onClick ? 'button' : 'article'
  return (
    <Tag
      className={`stat-card ${onClick ? 'stat-card--clickable' : ''}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <div className={`stat-card__icon stat-card__icon--${tone}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="stat-card__body">
        <div className="stat-card__label">{label}</div>
        {loading
          ? <div className="stat-card__value is-loading"><span className="skeleton" /></div>
          : error
            ? <div className="stat-card__no-data">Sin datos</div>
            : children}
      </div>
    </Tag>
  )
}

function Delta({ current, previous, prevLabel }: { current: number; previous: number; prevLabel: string }) {
  if (previous <= 0) {
    return <div className="stat-card__trend muted">Sin comparativa</div>
  }
  const pct = ((current - previous) / previous) * 100
  const up = pct >= 0
  const Icon = up ? ArrowUp : ArrowDown
  const cls = `stat-card__trend ${up ? 'up' : 'down'}`
  return (
    <div className={cls}>
      <Icon size={14} />
      {Math.abs(pct).toFixed(1)}% vs {prevLabel}
    </div>
  )
}
