import type { PageResponse } from '../types/common'
import type {
  BudgetEntry,
  BudgetEntryCreateRequest,
  BudgetSummary,
  CategoryBreakdown,
  MonthlyFlow,
  EntryType,
  BudgetCategory,
  BudgetBusinessUnit,
} from '../types/budget'
import { apiGet, apiPost } from './client'

// Servicio de presupuesto — refleja BudgetController (/api/v1/budget).
// Endpoints: /entries (paginated), /entries/{id}, /dashboard/{summary,breakdown,monthly-flow}.

export interface ListBudgetEntriesParams {
  type?:         EntryType
  category?:     BudgetCategory
  businessUnit?: BudgetBusinessUnit
  contactId?:    string
  from?:         string             // YYYY-MM-DD
  to?:           string
  projected?:    boolean
  page?:         number
  size?:         number
  sort?:         string
}

function buildQuery(params: Record<string, unknown>): string {
  const qp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qp.set(k, String(v))
  }
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const budgetApi = {
  listEntries(params: ListBudgetEntriesParams = {}): Promise<PageResponse<BudgetEntry>> {
    return apiGet<PageResponse<BudgetEntry>>(`/budget/entries${buildQuery({ ...params })}`)
  },
  getEntry(id: string): Promise<BudgetEntry> {
    return apiGet<BudgetEntry>(`/budget/entries/${id}`)
  },
  createEntry(body: BudgetEntryCreateRequest): Promise<BudgetEntry> {
    return apiPost<BudgetEntry, BudgetEntryCreateRequest>('/budget/entries', body)
  },
  summary(year: number, month: number): Promise<BudgetSummary> {
    return apiGet<BudgetSummary>(`/budget/dashboard/summary${buildQuery({ year, month })}`)
  },
  breakdown(year: number, month: number): Promise<CategoryBreakdown[]> {
    return apiGet<CategoryBreakdown[]>(`/budget/dashboard/breakdown${buildQuery({ year, month })}`)
  },
  monthlyFlow(year: number): Promise<MonthlyFlow[]> {
    return apiGet<MonthlyFlow[]>(`/budget/dashboard/monthly-flow${buildQuery({ year })}`)
  },
}
