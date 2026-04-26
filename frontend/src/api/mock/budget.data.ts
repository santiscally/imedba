import type { BudgetEntry } from '../../types/budget'

// Dataset mock de entries presupuestarios. Cubre distintas categorías,
// unidades de negocio y meses para que el dashboard tenga gráfico real.
// Hoy de referencia: 2026-04-25.

let entryCounter = 1
function nextId(): string {
  return `99999999-9999-9999-9999-${(entryCounter++).toString().padStart(12, '0')}`
}

interface Seed {
  entryType:    BudgetEntry['entryType']
  category:     BudgetEntry['category']
  subcategory?: string | null
  businessUnit?: BudgetEntry['businessUnit']
  concept:      string
  amount:       number
  entryDate:    string
  paymentMethod?: BudgetEntry['paymentMethod']
  cash?:        boolean
  projected?:   boolean
  recurring?:   boolean
  notes?:       string | null
}

const SEEDS: Seed[] = [
  // ── Marzo 2026
  { entryType: 'INCOME',  category: 'INCOME_ENROLLMENT', businessUnit: 'RESIDENCIAS', concept: 'Inscripciones marzo — Intensivo Vivo', amount: 4_800_000, entryDate: '2026-03-10', paymentMethod: 'TRANSFERENCIA' },
  { entryType: 'INCOME',  category: 'INCOME_ENROLLMENT', businessUnit: 'RESIDENCIAS', concept: 'Inscripciones marzo — Intensivo Libre', amount: 3_900_000, entryDate: '2026-03-12', paymentMethod: 'TRANSFERENCIA' },
  { entryType: 'INCOME',  category: 'INCOME_SALES',      businessUnit: 'EDITORIAL',   concept: 'Venta de libros — marzo',              amount:   780_000, entryDate: '2026-03-20', paymentMethod: 'MERCADO_PAGO' },
  { entryType: 'EXPENSE', category: 'FIXED',             businessUnit: 'GENERAL',     concept: 'Alquiler oficina',                     amount:   720_000, entryDate: '2026-03-05', paymentMethod: 'TRANSFERENCIA', recurring: true },
  { entryType: 'EXPENSE', category: 'FIXED',             businessUnit: 'GENERAL',     concept: 'Sueldos administrativos',              amount: 1_650_000, entryDate: '2026-03-05', paymentMethod: 'TRANSFERENCIA', recurring: true },
  { entryType: 'EXPENSE', category: 'VARIABLE',          businessUnit: 'GENERAL',     concept: 'Honorarios docentes marzo',            amount: 1_280_000, entryDate: '2026-03-28', paymentMethod: 'TRANSFERENCIA' },
  { entryType: 'EXPENSE', category: 'VARIABLE',          businessUnit: 'EDITORIAL',   concept: 'Imprenta — tirada Sólo Choice',        amount:   420_000, entryDate: '2026-03-18', paymentMethod: 'TRANSFERENCIA' },
  { entryType: 'EXPENSE', category: 'MAINTENANCE',       businessUnit: 'GENERAL',     concept: 'Servicio limpieza y mantenimiento',    amount:    95_000, entryDate: '2026-03-25', paymentMethod: 'EFECTIVO',     cash: true, recurring: true },

  // ── Abril 2026 (mes en curso)
  { entryType: 'INCOME',  category: 'INCOME_ENROLLMENT', businessUnit: 'RESIDENCIAS',        concept: 'Cuotas abril — Vivo',                   amount: 3_650_000, entryDate: '2026-04-08', paymentMethod: 'TRANSFERENCIA' },
  { entryType: 'INCOME',  category: 'INCOME_ENROLLMENT', businessUnit: 'RESIDENCIAS',        concept: 'Cuotas abril — Libre',                  amount: 3_180_000, entryDate: '2026-04-10', paymentMethod: 'TRANSFERENCIA' },
  { entryType: 'INCOME',  category: 'INCOME_ENROLLMENT', businessUnit: 'FORMACION_SUPERIOR', concept: 'Cobro Diplomatura Cardiología — abril', amount: 1_300_000, entryDate: '2026-04-12', paymentMethod: 'TRANSFERENCIA' },
  { entryType: 'INCOME',  category: 'INCOME_SALES',      businessUnit: 'EDITORIAL',          concept: 'Venta de libros — abril (parcial)',     amount:   430_000, entryDate: '2026-04-15', paymentMethod: 'MERCADO_PAGO' },
  { entryType: 'INCOME',  category: 'INCOME_OTHER',      businessUnit: 'GENERAL',            concept: 'Asesoría externa puntual',              amount:   180_000, entryDate: '2026-04-18', paymentMethod: 'TRANSFERENCIA' },
  { entryType: 'EXPENSE', category: 'FIXED',             businessUnit: 'GENERAL',            concept: 'Alquiler oficina',                      amount:   780_000, entryDate: '2026-04-05', paymentMethod: 'TRANSFERENCIA', recurring: true },
  { entryType: 'EXPENSE', category: 'FIXED',             businessUnit: 'GENERAL',            concept: 'Sueldos administrativos',               amount: 1_780_000, entryDate: '2026-04-05', paymentMethod: 'TRANSFERENCIA', recurring: true },
  { entryType: 'EXPENSE', category: 'VARIABLE',          businessUnit: 'GENERAL',            concept: 'Honorarios docentes abril',             amount: 1_350_000, entryDate: '2026-04-22', paymentMethod: 'TRANSFERENCIA' },
  { entryType: 'EXPENSE', category: 'VARIABLE',          businessUnit: 'EDITORIAL',          concept: 'Diseño tapa nuevo libro',               amount:   180_000, entryDate: '2026-04-12', paymentMethod: 'TRANSFERENCIA' },
  { entryType: 'EXPENSE', category: 'MAINTENANCE',       businessUnit: 'GENERAL',            concept: 'Mantenimiento servidor cloud',          amount:    65_000, entryDate: '2026-04-15', paymentMethod: 'TARJETA_CREDITO' },
  { entryType: 'EXPENSE', category: 'OTHER',             businessUnit: 'GENERAL',            concept: 'Caja chica',                            amount:    35_000, entryDate: '2026-04-18', paymentMethod: 'EFECTIVO', cash: true },

  // ── Mayo 2026 (proyectados)
  { entryType: 'INCOME',  category: 'INCOME_ENROLLMENT', businessUnit: 'RESIDENCIAS', concept: 'Cuotas mayo — proyectado',     amount: 7_200_000, entryDate: '2026-05-10', projected: true },
  { entryType: 'EXPENSE', category: 'FIXED',             businessUnit: 'GENERAL',     concept: 'Alquiler mayo — proyectado',   amount:   780_000, entryDate: '2026-05-05', projected: true, recurring: true },
  { entryType: 'EXPENSE', category: 'FIXED',             businessUnit: 'GENERAL',     concept: 'Sueldos mayo — proyectado',    amount: 1_780_000, entryDate: '2026-05-05', projected: true, recurring: true },

  // ── Febrero 2026
  { entryType: 'INCOME',  category: 'INCOME_ENROLLMENT', businessUnit: 'RESIDENCIAS', concept: 'Inscripciones febrero', amount: 5_200_000, entryDate: '2026-02-15', paymentMethod: 'TRANSFERENCIA' },
  { entryType: 'INCOME',  category: 'INCOME_SALES',      businessUnit: 'EDITORIAL',   concept: 'Ventas libros febrero', amount:   620_000, entryDate: '2026-02-20', paymentMethod: 'MERCADO_PAGO' },
  { entryType: 'EXPENSE', category: 'FIXED',             businessUnit: 'GENERAL',     concept: 'Alquiler febrero',      amount:   720_000, entryDate: '2026-02-05', paymentMethod: 'TRANSFERENCIA', recurring: true },
  { entryType: 'EXPENSE', category: 'FIXED',             businessUnit: 'GENERAL',     concept: 'Sueldos febrero',       amount: 1_650_000, entryDate: '2026-02-05', paymentMethod: 'TRANSFERENCIA', recurring: true },
  { entryType: 'EXPENSE', category: 'VARIABLE',          businessUnit: 'GENERAL',     concept: 'Docentes febrero',      amount:   980_000, entryDate: '2026-02-25', paymentMethod: 'TRANSFERENCIA' },

  // ── Enero 2026
  { entryType: 'INCOME',  category: 'INCOME_ENROLLMENT', businessUnit: 'RESIDENCIAS', concept: 'Inscripciones enero',   amount: 6_800_000, entryDate: '2026-01-15', paymentMethod: 'TRANSFERENCIA' },
  { entryType: 'EXPENSE', category: 'FIXED',             businessUnit: 'GENERAL',     concept: 'Alquiler enero',        amount:   720_000, entryDate: '2026-01-05', paymentMethod: 'TRANSFERENCIA', recurring: true },
  { entryType: 'EXPENSE', category: 'FIXED',             businessUnit: 'GENERAL',     concept: 'Sueldos enero',         amount: 1_500_000, entryDate: '2026-01-05', paymentMethod: 'TRANSFERENCIA', recurring: true },
  { entryType: 'EXPENSE', category: 'VARIABLE',          businessUnit: 'GENERAL',     concept: 'Docentes enero',        amount:   620_000, entryDate: '2026-01-28', paymentMethod: 'TRANSFERENCIA' },
]

const now = '2026-04-20T14:30:00Z'

function build(s: Seed): BudgetEntry {
  const [y, m] = s.entryDate.split('-').map(Number)
  return {
    id:               nextId(),
    entryType:        s.entryType,
    category:         s.category,
    subcategory:      s.subcategory ?? null,
    businessUnit:     s.businessUnit ?? null,
    concept:          s.concept,
    amount:           s.amount,
    entryDate:        s.entryDate,
    periodMonth:      m,
    periodYear:       y,
    paymentMethod:    s.paymentMethod ?? null,
    recurring:        s.recurring ?? null,
    cash:             s.cash ?? null,
    projected:        s.projected ?? false,
    referenceNumber:  null,
    receiptFilePath:  null,
    contactId:        null,
    enrollmentId:     null,
    paymentId:        null,
    bookSaleId:       null,
    notes:            s.notes ?? null,
    registeredBy:     null,
    createdAt:        now,
    updatedAt:        now,
  }
}

export const MOCK_BUDGET_ENTRIES: BudgetEntry[] = SEEDS.map(build)
