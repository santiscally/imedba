import type {
  Installment,
  InstallmentStatus,
  InstallmentEnrollmentSummary,
} from '../../types/installment'

// Dataset mock de cuotas — generado a partir de un puñado de inscripciones de
// `enrollments.data.ts`. La idea es tener variedad de estados (pagadas,
// pendientes, vencidas, suspendidas) para que las pantallas se vean reales.

// Hoy de referencia: 2026-04-25.

interface SeedRow {
  enr:    InstallmentEnrollmentSummary
  base:   number               // monto base de cada cuota
  states: InstallmentStatus[]  // un estado por cuota (en orden)
  startYear:  number
  startMonth: number           // 1–12 — la primera cuota vence el día 10 de este mes/año
  surchargeOn?: number[]       // índices (1-based) que llevan recargo del 5%
  paidLate?:    number[]       // índices (1-based) pagados después del día 10 (con recargo)
  moodleSuspendedFrom?: number // índice (1-based) desde el cual moodleSuspended=true
}

const enrAlvarezVivo: InstallmentEnrollmentSummary = {
  id: '33333333-3333-3333-3333-000000000001',
  studentId: '11111111-1111-1111-1111-000000000001',
  studentFirstName: 'María Sol', studentLastName: 'Álvarez',
  courseId: '22222222-2222-2222-2222-000000000002',
  courseName: 'Curso Intensivo Vivo 2026',
  courseCode: 'RMA-INT-V-2026',
}

const enrBenitez: InstallmentEnrollmentSummary = {
  id: '33333333-3333-3333-3333-000000000002',
  studentId: '11111111-1111-1111-1111-000000000002',
  studentFirstName: 'Juan Ignacio', studentLastName: 'Benítez',
  courseId: '22222222-2222-2222-2222-000000000001',
  courseName: 'Curso Intensivo Libre 2026',
  courseCode: 'RMA-INT-L-2026',
}

const enrCespedes: InstallmentEnrollmentSummary = {
  id: '33333333-3333-3333-3333-000000000003',
  studentId: '11111111-1111-1111-1111-000000000003',
  studentFirstName: 'Camila', studentLastName: 'Céspedes',
  courseId: '22222222-2222-2222-2222-000000000002',
  courseName: 'Curso Intensivo Vivo 2026',
  courseCode: 'RMA-INT-V-2026',
}

const enrDamico: InstallmentEnrollmentSummary = {
  id: '33333333-3333-3333-3333-000000000004',
  studentId: '11111111-1111-1111-1111-000000000004',
  studentFirstName: 'Federico', studentLastName: "D'Amico",
  courseId: '22222222-2222-2222-2222-000000000005',
  courseName: 'Curso Sólo Choice Córdoba 2026',
  courseCode: 'RMA-SC-CBA-2026',
}

const enrFernandez: InstallmentEnrollmentSummary = {
  id: '33333333-3333-3333-3333-000000000006',
  studentId: '11111111-1111-1111-1111-000000000006',
  studentFirstName: 'Mauro', studentLastName: 'Fernández',
  courseId: '22222222-2222-2222-2222-000000000002',
  courseName: 'Curso Intensivo Vivo 2026',
  courseCode: 'RMA-INT-V-2026',
}

const enrGonzalezAgu: InstallmentEnrollmentSummary = {
  id: '33333333-3333-3333-3333-000000000007',
  studentId: '11111111-1111-1111-1111-000000000007',
  studentFirstName: 'Agustina', studentLastName: 'González',
  courseId: '22222222-2222-2222-2222-000000000009',
  courseName: 'Curso Sólo Choice Plus Libre',
  courseCode: 'PLUS-SC-L',
}

const enrNunez: InstallmentEnrollmentSummary = {
  id: '33333333-3333-3333-3333-000000000013',
  studentId: '11111111-1111-1111-1111-000000000014',
  studentFirstName: 'Natalia', studentLastName: 'Núñez',
  courseId: '22222222-2222-2222-2222-000000000008',
  courseName: 'Curso Intensivo Abril-Mayo',
  courseCode: 'RMA-INT-AM',
}

// Hoy = 2026-04-25 → la cuota de abril 2026 vence el 10/04 → 15 días vencida
// si está PENDING. Marcamos la #5 de Álvarez como OVERDUE para mostrar.
const SEED: SeedRow[] = [
  // Álvarez — Intensivo Vivo (10 cuotas, base 118.000) — cuotas dic-25 a sep-26
  {
    enr: enrAlvarezVivo,
    base: 118_000,
    startYear: 2025, startMonth: 12,
    states: ['PAID','PAID','PAID','PAID','OVERDUE','PENDING','PENDING','PENDING','PENDING','PENDING'],
    paidLate: [3],   // febrero la pagó tarde con recargo
  },
  // Benítez — pago único 918.000 (Intensivo Libre)
  {
    enr: enrBenitez,
    base: 918_000,
    startYear: 2025, startMonth: 12,
    states: ['PAID'],
  },
  // Céspedes — Intensivo Vivo (10 cuotas, base 124.000)
  {
    enr: enrCespedes,
    base: 124_000,
    startYear: 2025, startMonth: 12,
    states: ['PAID','PAID','PAID','OVERDUE','PENDING','PENDING','PENDING','PENDING','PENDING','PENDING'],
    paidLate: [2],
  },
  // D'Amico — Sólo Choice CBA (8 cuotas, base 80.000)
  {
    enr: enrDamico,
    base: 80_000,
    startYear: 2025, startMonth: 12,
    states: ['PAID','PAID','PAID','PAID','PENDING','PENDING','PENDING','PENDING'],
  },
  // Fernández — SUSPENDED (10 cuotas, base 118.000) — pagó 3, 2 suspendidas, resto pending
  {
    enr: enrFernandez,
    base: 118_000,
    startYear: 2025, startMonth: 12,
    states: ['PAID','PAID','PAID','SUSPENDED','SUSPENDED','PENDING','PENDING','PENDING','PENDING','PENDING'],
    moodleSuspendedFrom: 4,
  },
  // González Agustina — Sólo Choice Plus Libre (6 cuotas, base 173.333)
  {
    enr: enrGonzalezAgu,
    base: 173_333,
    startYear: 2026, startMonth: 1,
    states: ['PAID','PAID','PAID','OVERDUE','PENDING','PENDING'],
  },
  // Núñez — Intensivo Abril-Mayo (2 cuotas, base 340.000)
  {
    enr: enrNunez,
    base: 340_000,
    startYear: 2026, startMonth: 3,
    states: ['OVERDUE','PENDING'],
  },
]

// Helpers
function pad(n: number): string { return n.toString().padStart(2, '0') }

function dueDateOf(monthOffset: number, startMonth: number, startYear: number): string {
  // monthOffset 0-based: 0 = primer mes
  const total = (startMonth - 1) + monthOffset
  const y = startYear + Math.floor(total / 12)
  const m = (total % 12) + 1
  return `${y}-${pad(m)}-10`
}

function paidAtFor(dueDate: string, late: boolean): string {
  // Si late=true → pagó el día 18 del mismo mes; si no, el 5
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
  const surchargeIdx = new Set(row.surchargeOn ?? [])
  const lateIdx      = new Set(row.paidLate ?? [])
  return row.states.map((status, i) => {
    const num = i + 1
    const dueDate = dueDateOf(i, row.startMonth, row.startYear)
    const hasSurcharge = surchargeIdx.has(num) || lateIdx.has(num)
    const surcharge = hasSurcharge ? Math.round(row.base * 0.05) : 0
    const totalDue = row.base + surcharge
    const paidAt: string | null = status === 'PAID'
      ? paidAtFor(dueDate, lateIdx.has(num))
      : null
    const moodleSuspended =
      row.moodleSuspendedFrom !== undefined && num >= row.moodleSuspendedFrom
    return {
      id:              nextId(),
      enrollment:      row.enr,
      number:          num,
      dueDate,
      baseAmount:      row.base,
      surcharge,
      totalDue,
      status,
      paidAt,
      moodleSuspended,
      createdAt:       row.enr.id.slice(-12) === '000000000001' ? '2025-11-05T10:00:00Z' : now,
      updatedAt:       paidAt ?? now,
    }
  })
}

export const MOCK_INSTALLMENTS: Installment[] = SEED.flatMap(buildFromSeed)
