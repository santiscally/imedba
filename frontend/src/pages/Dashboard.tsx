import {
  Users, AlertCircle, BookOpen, Wallet,
  Plus, CreditCard, UserPlus,
  Clock, ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFetch } from '../hooks/useFetch'
import EmptyState from '../components/EmptyState'
import './Dashboard.scss'

// ─── Tipos que esperamos del backend ─────────────────────────────────────────
interface DashboardSummary {
  alumnosActivos: number
  cuotasVencidas: number
  cursosActivos:  number
  ingresosMes:    number
}

interface OverdueInstallment {
  id:             string
  alumno:         string
  curso:          string
  cuotaNumero:    number
  cuotaTotal:     number
  diasVencidos:   number
  monto:          number
}

// ─── Meta de las stat cards ──────────────────────────────────────────────────
interface StatMeta {
  key:    keyof DashboardSummary
  icon:   LucideIcon
  label:  string
  tone:   'azul' | 'rojo' | 'verde' | 'primary'
  format: 'number' | 'currency'
}

const STATS: StatMeta[] = [
  { key: 'alumnosActivos', icon: Users,       label: 'Alumnos activos',  tone: 'azul',    format: 'number'   },
  { key: 'cuotasVencidas', icon: AlertCircle, label: 'Cuotas vencidas',  tone: 'rojo',    format: 'number'   },
  { key: 'cursosActivos',  icon: BookOpen,    label: 'Cursos activos',   tone: 'verde',   format: 'number'   },
  { key: 'ingresosMes',    icon: Wallet,      label: 'Ingresos del mes', tone: 'primary', format: 'currency' },
]

interface QuickAction {
  icon:  LucideIcon
  label: string
  desc:  string
  to:    string
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: UserPlus,   label: 'Nueva inscripción', desc: 'Inscribir alumno en curso', to: '/inscripciones' },
  { icon: CreditCard, label: 'Registrar pago',    desc: 'Cobrar cuota o liquidar',   to: '/cuotas'        },
  { icon: Plus,       label: 'Nuevo alumno',      desc: 'Dar de alta en el sistema', to: '/alumnos'       },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatNumber = (n: number) =>
  new Intl.NumberFormat('es-AR').format(n)

const formatCurrency = (n: number) =>
  `$${new Intl.NumberFormat('es-AR').format(n)}`

const formatStat = (val: number | undefined, format: StatMeta['format']) => {
  if (val == null) return '—'
  return format === 'currency' ? formatCurrency(val) : formatNumber(val)
}

// ─── Componente ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const summary  = useFetch<DashboardSummary>('/dashboard/summary')
  const overdue  = useFetch<OverdueInstallment[]>('/installments/overdue')

  return (
    <div className="dashboard">

      {/* STATS */}
      <section className="stats-grid">
        {STATS.map(meta => {
          const Icon = meta.icon
          const value = formatStat(summary.data?.[meta.key], meta.format)
          const sinDatos = !summary.loading && (summary.error || !summary.data)

          return (
            <article className="stat-card" key={meta.label}>
              <div className={`stat-card__icon stat-card__icon--${meta.tone}`}>
                <Icon size={20} strokeWidth={2} />
              </div>
              <div className="stat-card__body">
                <div className="stat-card__label">{meta.label}</div>
                <div className={`stat-card__value ${summary.loading ? 'is-loading' : ''}`}>
                  {summary.loading ? <span className="skeleton" /> : value}
                </div>
                {sinDatos && <div className="stat-card__no-data">Sin datos</div>}
              </div>
            </article>
          )
        })}
      </section>

      {/* QUICK ACTIONS */}
      <section className="section">
        <div className="section__header">
          <h2 className="section__title">Accesos rápidos</h2>
        </div>
        <div className="quick-actions">
          {QUICK_ACTIONS.map(action => {
            const Icon = action.icon
            return (
              <button
                className="quick-action"
                key={action.label}
                onClick={() => navigate(action.to)}
              >
                <div className="quick-action__icon">
                  <Icon size={20} strokeWidth={2} />
                </div>
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

      {/* ALERTAS — cuotas vencidas > 10 días */}
      <section className="section">
        <div className="section__header">
          <h2 className="section__title">
            <AlertCircle size={16} className="section__title-icon" />
            Cuotas vencidas hace más de 10 días
          </h2>
          {overdue.data && overdue.data.length > 0 && (
            <button className="section__action">Ver todas</button>
          )}
        </div>

        {overdue.loading ? (
          <div className="loading-block">Cargando...</div>
        ) : overdue.error || !overdue.data || overdue.data.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="alerts-card">
            {overdue.data.map(a => (
              <div className="alert-row" key={a.id}>
                <div className="alert-row__main">
                  <div className="alert-row__alumno">{a.alumno}</div>
                  <div className="alert-row__meta">
                    {a.curso} · Cuota {a.cuotaNumero}/{a.cuotaTotal}
                  </div>
                </div>
                <div className="alert-row__monto">{formatCurrency(a.monto)}</div>
                <div className="alert-row__dias">
                  <Clock size={12} />
                  {a.diasVencidos} días
                </div>
                <button className="alert-row__btn">Gestionar</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ACTIVIDAD RECIENTE — sin endpoint aún */}
      <section className="section">
        <div className="section__header">
          <h2 className="section__title">Actividad reciente</h2>
        </div>
        <EmptyState />
      </section>

    </div>
  )
}
