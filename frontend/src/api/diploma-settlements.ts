import type {
  DiplomaSettlement,
  DiplomaSettlementCreateRequest,
} from '../types/diploma-settlement'
import { apiGet, apiPost, apiPut, apiGetFile, saveFile } from './client'

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

  /**
   * Comprobante de la liquidación. El backend sólo lo emite si está PAGADA
   * (409 si no), y manda el nombre en el Content-Disposition — el fallback de
   * acá es por si un proxy lo recorta.
   */
  async downloadPdf(id: string, label?: string): Promise<void> {
    const file = await apiGetFile(`/diploma-settlements/${id}/pdf`)
    const slug = (label ?? 'diplomatura').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    saveFile(file, `liquidacion-diplomatura-${slug || 'diplomatura'}.pdf`)
  },
}
