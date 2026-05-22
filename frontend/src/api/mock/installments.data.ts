import type { Installment, InstallmentStatus } from '../../types/installment'

// Dataset mock de cuotas (forma PLANA, igual que el backend: solo enrollmentId).
// Variedad de estados PENDING / PAID / OVERDUE. Hoy de referencia: 2026-04-25.

interface SeedRow {
  enrollmentId: string
  base:    number
  states:  InstallmentStatus[]
  startYear:  number
  startMonth: number          // la cuota #1 vence el día 10 de este mes/año
  paidLate?:  number[]        // índices (1-based) pagados tarde (con recargo)
}

const SEED: SeedRow[] = [
  // Álvarez — Intensivo Vivo (10 cuotas, base 118.000)
  {
    enrollmentId: '33333333-3333-3333-3333-000000000001',
    base: 118_000, startYear: 2025, startMonth: 12,
    states: ['PAID','PAID','PAID','PAID','OVERDUE','PENDING','PENDING','PENDING','PENDING','PENDING'],
    paidLate: [3],
  },
  // Benítez — pago único (1 cuota)
  {
    enrollmentId: '33333333-3333-3333-3333-000000000002',
    base: 918_000, startYear: 2025, startMonth: 12,
    states: ['PAID'],
  },
  // Céspedes — Intensivo Vivo (10 cuotas, base 124.000)
  {
    enrollmentId: '33333333-3333-3333-3333-000000000003',
    base: 124_000, startYear: 2025, startMonth: 12,
    states: ['PAID','PAID','PAID','OVERDUE','PENDING','PENDING','PENDING','PENDING','PENDING','PENDING'],
    paidLate: [2],
  },
  // D'Amico — Sólo Choice CBA (8 cuotas, base 80.000)
  // Cuota #5 marcada OVERDUE (vence 2026-04-10) para testing del dashboard.
  {
    enrollmentId: '33333333-3333-3333-3333-000000000004',
    base: 80_000, startYear: 2025, startMonth: 12,
    states: ['PAID','PAID','PAID','PAID','OVERDUE','PENDING','PENDING','PENDING'],
  },
  // Fernández — (10 cuotas, base 118.000)
  {
    enrollmentId: '33333333-3333-3333-3333-000000000006',
    base: 118_000, startYear: 2025, startMonth: 12,
    states: ['PAID','PAID','PAID','OVERDUE','OVERDUE','PENDING','PENDING','PENDING','PENDING','PENDING'],
  },
  // González Agustina — Sólo Choice Plus Libre (6 cuotas, base 173.333)
  {
    enrollmentId: '33333333-3333-3333-3333-000000000007',
    base: 173_333, startYear: 2026, startMonth: 1,
    states: ['PAID','PAID','PAID','OVERDUE','PENDING','PENDING'],
  },
]

function pad(n: number): string { return n.toString().padStart(2, '0') }

function dueDateOf(monthOffset: number, startMonth: number, startYear: number): string {
  const total = (startMonth - 1) + monthOffset
  const y = startYear + Math.floor(total / 12)
  const m = (total % 12) + 1
  return `${y}-${pad(m)}-10`
}

function paidAtFor(dueDate: string, late: boolean): string {
  const day = late ? 18 : 5
  const [y, m] = dueDate.split('-')
  return `${y}-${m}-${pad(day)}T11:00:00Z`
}

let idCounter = 1
function nextId(): string {
  return `44444444-4444-4444-4444-${(idCounter++).toString().padStart(12, '0')}`
}

const now = '2026-04-20T14:30:00Z'

function buildFromSeed(row: SeedRow): Installment[] {
  const lateIdx = new Set(row.paidLate ?? [])
  return row.states.map((status, i) => {
    const num = i + 1
    const dueDate = dueDateOf(i, row.startMonth, row.startYear)
    const hasSurcharge = lateIdx.has(num) || status === 'OVERDUE'
    const surchargeAmount = hasSurcharge ? Math.round(row.base * 0.05) : 0
    const totalDue = row.base + surchargeAmount
    const paidAt: string | null = status === 'PAID' ? paidAtFor(dueDate, lateIdx.has(num)) : null
    return {
      id:              nextId(),
      enrollmentId:    row.enrollmentId,
      number:          num,
      amount:          row.base,
      surchargeAmount,
      totalDue,
      dueDate,
      status,
      paidAt,
      lastAlertSentAt: null,
      createdAt:       now,
      updatedAt:       paidAt ?? now,
    }
  })
}

export const MOCK_INSTALLMENTS: Installment[] = SEED.flatMap(buildFromSeed)
