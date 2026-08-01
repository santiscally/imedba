import type {
  CommissionSeller,
  SalesCommission,
  SalesCommissionCreateRequest,
  SalesCommissionSummary,
} from '../types/sales-commission'
import { apiGet, apiPost, apiPut } from './client'

// Comisiones de vendedora — refleja SalesCommissionController
// (/api/v1/sales-commissions). Authorities: sales_commissions:read / :write.

export interface PreviewParams {
  sellerUserId:   string
  year:           number
  month:          number
  tier1Rate?:     number
  tier2Rate?:     number
  booksRate?:     number
  tierThreshold?: number
}

export const salesCommissionsApi = {
  /** Vendedores con ventas en el período, con el nombre ya resuelto por el backend. */
  sellers(year: number, month: number): Promise<CommissionSeller[]> {
    return apiGet<CommissionSeller[]>(`/sales-commissions/sellers?year=${year}&month=${month}`)
  },

  /**
   * Calcula sin persistir. Es el endpoint con el que conviene arrancar: deja ver
   * el número antes de crear el borrador. Devuelve `id: null` en la liquidación y
   * en las líneas, porque la entidad es transitoria.
   */
  preview(params: PreviewParams): Promise<SalesCommission> {
    const qp = new URLSearchParams({
      sellerUserId: params.sellerUserId,
      year:         String(params.year),
      month:        String(params.month),
    })
    if (params.tier1Rate     !== undefined) qp.set('tier1Rate',     String(params.tier1Rate))
    if (params.tier2Rate     !== undefined) qp.set('tier2Rate',     String(params.tier2Rate))
    if (params.booksRate     !== undefined) qp.set('booksRate',     String(params.booksRate))
    if (params.tierThreshold !== undefined) qp.set('tierThreshold', String(params.tierThreshold))
    return apiGet<SalesCommission>(`/sales-commissions/preview?${qp}`)
  },

  listBySeller(sellerUserId: string): Promise<SalesCommissionSummary[]> {
    return apiGet<SalesCommissionSummary[]>(`/sales-commissions?sellerUserId=${sellerUserId}`)
  },

  listByPeriod(year: number, month: number): Promise<SalesCommissionSummary[]> {
    return apiGet<SalesCommissionSummary[]>(`/sales-commissions?year=${year}&month=${month}`)
  },

  get(id: string): Promise<SalesCommission> {
    return apiGet<SalesCommission>(`/sales-commissions/${id}`)
  },

  create(body: SalesCommissionCreateRequest): Promise<SalesCommission> {
    return apiPost<SalesCommission, SalesCommissionCreateRequest>('/sales-commissions', body)
  },

  recompute(id: string): Promise<SalesCommission> {
    return apiPut<SalesCommission, undefined>(`/sales-commissions/${id}/recompute`, undefined)
  },
  approve(id: string): Promise<SalesCommission> {
    return apiPut<SalesCommission, undefined>(`/sales-commissions/${id}/approve`, undefined)
  },
  markPaid(id: string): Promise<SalesCommission> {
    return apiPut<SalesCommission, undefined>(`/sales-commissions/${id}/mark-paid`, undefined)
  },
}
