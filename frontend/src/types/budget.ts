import type { Instant, UUID } from './common'
import type { PaymentMethod } from './enrollment'
import { BUSINESS_UNITS, BUSINESS_UNIT_LABELS, type BusinessUnit } from './course'

// Refleja com.imedba.modules.budget.entity.EntryType
export type EntryType = 'INCOME' | 'EXPENSE'

export const ENTRY_TYPES: EntryType[] = ['INCOME', 'EXPENSE']

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  INCOME:  'Ingreso',
  EXPENSE: 'Egreso',
}

// Refleja com.imedba.modules.budget.entity.BudgetCategory
export type BudgetCategory =
  | 'FIXED'
  | 'VARIABLE'
  | 'MAINTENANCE'
  | 'INCOME_SALES'
  | 'INCOME_ENROLLMENT'
  | 'INCOME_OTHER'
  | 'SALARIES'
  | 'SUPPLIERS'
  | 'TEACHERS'
  | 'ADVERTISING'
  | 'OFFICE'
  | 'TRAVEL'
  | 'EDITORIAL_COSTS'
  | 'SUBSCRIPTIONS'
  | 'TAXES'
  | 'BANK_FEES'
  | 'OTHER'

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  FIXED:             'Costo fijo',
  VARIABLE:          'Costo variable',
  MAINTENANCE:       'Mantenimiento',
  INCOME_SALES:      'Ingreso · ventas',
  INCOME_ENROLLMENT: 'Ingreso · inscripciones',
  INCOME_OTHER:      'Ingreso · otros',
  SALARIES:          'Sueldos',
  SUPPLIERS:         'Proveedores',
  TEACHERS:          'Docentes y tutores',
  ADVERTISING:       'Publicidad',
  OFFICE:            'Oficina y servicios',
  TRAVEL:            'Viajes / viáticos',
  EDITORIAL_COSTS:   'Editorial (impresión, autoría)',
  SUBSCRIPTIONS:     'Abonos',
  TAXES:             'Impuestos',
  BANK_FEES:         'Gastos bancarios / plataforma',
  OTHER:             'Gastos varios',
}

// Categorías de ingreso vs egreso (para filtrar el select según el tipo de movimiento).
export const INCOME_CATEGORIES: BudgetCategory[] = [
  'INCOME_SALES', 'INCOME_ENROLLMENT', 'INCOME_OTHER',
]

export const EXPENSE_CATEGORIES: BudgetCategory[] = [
  'SALARIES', 'SUPPLIERS', 'TEACHERS', 'ADVERTISING', 'OFFICE', 'TRAVEL',
  'EDITORIAL_COSTS', 'SUBSCRIPTIONS', 'TAXES', 'BANK_FEES',
  'FIXED', 'VARIABLE', 'MAINTENANCE', 'OTHER',
]

export const BUDGET_CATEGORIES: BudgetCategory[] = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

// Fase 9.a (V015): los enums BusinessUnit de course y budget quedaron UNIFICADOS
// en el backend (PREMATUROS migrado a FORMACION_SUPERIOR, OTROS → GENERAL).
// Acá sólo re-exportamos el canónico de course.ts — fuente única, no redefinir.
export type BudgetBusinessUnit = BusinessUnit
export const BUDGET_BUSINESS_UNITS = BUSINESS_UNITS
export const BUDGET_BUSINESS_UNIT_LABELS = BUSINESS_UNIT_LABELS

// Refleja com.imedba.modules.budget.dto.BudgetEntryResponse
export interface BudgetEntry {
  id:               UUID
  entryType:        EntryType
  category:         BudgetCategory
  subcategory:      string | null
  businessUnit:     BudgetBusinessUnit | null
  concept:          string
  amount:           number
  entryDate:        string             // LocalDate (YYYY-MM-DD)
  periodMonth:      number | null
  periodYear:       number | null
  paymentMethod:    PaymentMethod | null
  recurring:        boolean | null
  cash:             boolean | null
  projected:        boolean | null
  referenceNumber:  string | null
  receiptFilePath:  string | null
  contactId:        UUID | null
  enrollmentId:     UUID | null
  paymentId:        UUID | null
  bookSaleId:       UUID | null
  notes:            string | null
  registeredBy:     UUID | null
  createdAt:        Instant
  updatedAt:        Instant
}

// Refleja BudgetEntryCreateRequest
export interface BudgetEntryCreateRequest {
  entryType:        EntryType
  category:         BudgetCategory
  subcategory?:     string | null            // max 100
  businessUnit?:    BudgetBusinessUnit | null
  concept:          string                   // max 300
  amount:           number                   // ≥ 0
  entryDate:        string                   // YYYY-MM-DD
  paymentMethod?:   PaymentMethod | null
  recurring?:       boolean | null
  cash?:            boolean | null
  projected?:       boolean | null
  referenceNumber?: string | null            // max 200
  receiptFilePath?: string | null            // max 500
  contactId?:       UUID | null
  enrollmentId?:    UUID | null
  notes?:           string | null
}

// Refleja BudgetSummaryResponse
export interface BudgetSummary {
  year:             number
  month:            number
  totalIncome:      number
  totalExpense:     number
  balance:          number
  projectedIncome:  number
  projectedExpense: number
}

// Refleja CategoryBreakdownResponse
export interface CategoryBreakdown {
  entryType:    EntryType
  category:     BudgetCategory
  businessUnit: BudgetBusinessUnit | null
  total:        number
}

// Refleja MonthlyFlowResponse
export interface MonthlyFlow {
  year:    number
  month:   number
  income:  number
  expense: number
  balance: number
}
