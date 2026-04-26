import type {
  DiplomaSettlement,
  DiplomaSettlementCreateRequest,
} from '../types/diploma-settlement'
import { apiGet, apiPost, apiPut } from './client'

// Servicio de liquidaciones de diplomaturas — refleja DiplomaSettlementController
// (/api/v1/diploma-settlements). Listado SIEMPRE filtrado por diplomaId.

export const diplomaSettlementsApi = {
  listByDiploma(diplomaId: string): Promise<DiplomaSettlement[]> {
    return apiGet<DiplomaSettlement[]>(`/diploma-settlements?diplomaId=${diplomaId}`)
  },
  get(id: string): Promise<DiplomaSettlement> {
    return apiGet<DiplomaSettlement>(`/diploma-settlements/${id}`)
  },
  create(body: DiplomaSettlementCreateRequest): Promise<DiplomaSettlement> {
    return apiPost<DiplomaSettlement, DiplomaSettlementCreateRequest>('/diploma-settlements', body)
  },
  recompute(id: string): Promise<DiplomaSettlement> {
    return apiPut<DiplomaSettlement, undefined>(`/diploma-settlements/${id}/recompute`, undefined)
  },
  approve(id: string): Promise<DiplomaSettlement> {
    return apiPut<DiplomaSettlement, undefined>(`/diploma-settlements/${id}/approve`, undefined)
  },
  markPaid(id: string): Promise<DiplomaSettlement> {
    return apiPut<DiplomaSettlement, undefined>(`/diploma-settlements/${id}/mark-paid`, undefined)
  },
}
