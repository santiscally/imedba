import { useEffect, useMemo, useState } from 'react'
import {
  Users, BookOpen, Wallet, FileSignature,
  Plus, CreditCard, UserPlus,
  ArrowRight, ArrowUp, ArrowDown, Clock, AlertCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { budgetApi } from '../api/budget'
import { studentsApi } from '../api/students'
import { enrollmentsApi } from '../api/enrollments'
import { bookSalesApi } from '../api/book-sales'
import { installmentsApi } from '../api/installments'
import { paymentsApi } from '../api/payments'
import { currentUser, hasAuthority } from '../lib/auth'
import './Dashboard.scss'

// Dashboard derivado de los endpoints reales — refuerzo positivo arriba,
// operativo abajo (reunión 22-05 §2.9). No depende de endpoints de "dashboard/*"
// (que no existen en el backend); todo se compone client-side.

// ─── Tipos de UI ─────────────────────────────────────────────────────────────
type Stat<T> =
  | { status: 'loading' }
  | { status: 'hidden' }
  | { status: 'error' }
  | { status: 'ok'; data: T }

interface IncomeData    { current: number; previous: number }
interface TopBookData   { name: string; quantity: number }
interface OverdueRow    { id: string; alumno: string; curso: string; totalOwed: number; dueDate: string; pending: number }
interface ActivityItem  { id: string; type: 'payment' | 'enrollment' | 'sale'; title: string; detail: string; amount: number | null; date: string }

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

function fmtShortInstant(iso: string): string {
  const dt = new Date(iso)
  return `${dt.getDate()} ${MONTHS_ES_SHORT[dt.getMonth()]}`
}

function daysOverdue(localDate: string): number {
  const [y, m, d] = localDate.split('-').map(Number)
  if (!y) return 0
  const due = new Date(y, m - 1, d).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((now - due) / 86_400_000))
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
  const [activity,       setActivity]       = useState<Stat<ActivityItem[]>>({ status: 'loading' })

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

    // Cuotas vencidas — top 10 deudores cuyo próximo vencimiento ya pasó
    if (!hasAuthority('installments:read')) {
      setOverdue({ status: 'hidden' })
    } else {
      const todayStr = new Date().toISOString().slice(0, 10)
      installmentsApi.debtors({ size: 30 })
        .then(r => {
          const rows: OverdueRow[] = r.content
            .filter(d => d.nextDueDate < todayStr)
            .slice(0, 10)
            .map(d => ({
              id:        d.enrollmentId,
              alumno:    d.studentName,
              curso:     d.courseName,
              totalOwed: d.totalOwed,
              dueDate:   d.nextDueDate,
              pending:   d.pendingCount,
            }))
          setOverdue({ status: 'ok', data: rows })
        })
        .catch(() => setOverdue({ status: 'error' }))
    }

    // Actividad reciente — merge de pagos, inscripciones y ventas
    const canPayments    = hasAuthority('payments:read')
    const canEnrollments = hasAuthority('enrollments:read')
    const canSales       = hasAuthority('book_sales:read')

    if (!canPayments && !canEnrollments && !canSales) {
      setActivity({ status: 'hidden' })
    } else {
      Promise.allSettled([
        canPayments    ? paymentsApi.list({ size: 5, sort: 'paymentDate,desc' })            : Promise.resolve(null),
        canEnrollments ? enrollmentsApi.list({ size: 5, sort: 'enrollmentDate,desc' })       : Promise.resolve(null),
        canSales       ? bookSalesApi.list({ size: 5, sort: 'saleDate,desc' })               : Promise.resolve(null),
      ]).then(([payRes, enrRes, saleRes]) => {
        const items: ActivityItem[] = []

        if (payRes.status === 'fulfilled' && payRes.value) {
          for (const p of payRes.value.content) {
            items.push({
              id:     `pay-${p.id}`,
              type:   'payment',
              title:  'Pago registrado',
              detail: p.receiptNumber ?? '—',
              amount: p.amount,
              date:   p.paymentDate,
            })
          }
        }
        if (enrRes.status === 'fulfilled' && enrRes.value) {
          for (const e of enrRes.value.content) {
            items.push({
              id:     `enr-${e.id}`,
              type:   'enrollment',
              title:  'Nueva inscripción',
              detail: `${e.student.lastName}, ${e.student.firstName} · ${e.course.name}`,
              amount: null,
              date:   e.enrollmentDate,
            })
          }
        }
        if (saleRes.status === 'fulfilled' && saleRes.value) {
          for (const s of saleRes.value.content) {
            items.push({
              id:     `sale-${s.id}`,
              type:   'sale',
              title:  'Venta de libro',
              detail: s.bookName ?? '—',
              amount: s.totalAmount,
              date:   s.saleDate,
            })
          }
        }

        items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        setActivity({ status: 'ok', data: items.slice(0, 8) })
      }).catch(() => setActivity({ status: 'error' }))
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
      <StatCard icon={Users} tone="azul" label="Alumnos nuevos del mes" loading={newStudents.status === 'loading'} error={newStudents.status === 'error'}>
        {newStudents.status === 'ok' && <div className="stat-card__value">{fmtNumber(newStudents.data)}</div>}
      </StatCard>
    )
  }

  function renderNewEnrollments() {
    if (newEnrollments.status === 'hidden') return null
    return (
      <StatCard icon={FileSignature} tone="verde" label="Inscripciones del mes" loading={newEnrollments.status === 'loading'} error={newEnrollments.status === 'error'}>
        {newEnrollments.status === 'ok' && <div className="stat-card__value">{fmtNumber(newEnrollments.data)}</div>}
      </StatCard>
    )
  }

  function renderTopBook() {
    if (topBook.status === 'hidden') return null
    return (
      <StatCard icon={BookOpen} tone="primary" label="Libro top del mes" loading={topBook.status === 'loading'} error={topBook.status === 'error'}>
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
        <h1 className="dashboard__hello">Hola{user?.fullName ? `, ${firstName(user.fullName)}` : ''}.</h1>
        <p className="dashboard__period">Resumen de <strong>{monthLabel(cur.year, cur.month)}</strong>.</p>
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
              Cuotas vencidas — top deudores
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
              {overdue.data.map(r => (
                <div className="alert-row" key={r.id}>
                  <div className="alert-row__main">
                    <div className="alert-row__alumno">{r.alumno}</div>
                    <div className="alert-row__meta">
                      {r.curso} · {r.pending} {r.pending === 1 ? 'cuota impaga' : 'cuotas impagas'}
                    </div>
                  </div>
                  <div className="alert-row__monto">{fmtCurrency(r.totalOwed)}</div>
                  <div className="alert-row__dias">
                    <Clock size={12} />
                    {daysOverdue(r.dueDate)} días
                  </div>
                  <button className="alert-row__btn" onClick={() => navigate('/cuotas')}>Gestionar</button>
                </div>
              ))}
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
              {activity.data.map(a => (
                <div className="activity-row" key={a.id}>
                  <span className={`activity-row__dot activity-row__dot--${
                    a.type === 'payment' ? 'verde' : a.type === 'enrollment' ? 'azul' : 'violeta'
                  }`} />
                  <div className="activity-row__content">
                    <div className="activity-row__text">
                      <strong>{a.title}</strong> — {a.detail}
                      {a.amount != null && ` · ${fmtCurrency(a.amount)}`}
                    </div>
                    <div className="activity-row__time">{fmtShortInstant(a.date)}</div>
                  </div>
                </div>
              ))}
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
  children?: React.ReactNode
}

function StatCard({ icon: Icon, tone, label, loading, error, children }: StatCardProps) {
  return (
    <article className="stat-card">
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
    </article>
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
