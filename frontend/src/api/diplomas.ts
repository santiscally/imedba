import type {
  Diploma,
  DiplomaCreateRequest,
  DiplomaUpdateRequest,
} from '../types/diploma'
import { apiGet, apiPost, apiPut } from './client'

// Servicio de diplomaturas — refleja DiplomaController (/api/v1/diplomas).
// IMPORTANTE: el endpoint NO devuelve PageResponse — devuelve List<Diploma>.
// Soft delete via PUT /{id}/deactivate (no DELETE).

export interface ListDiplomasParams {
  onlyActive?: boolean
}

function buildQuery(params: ListDiplomasParams): string {
  const qp = new URLSearchParams()
  if (params.onlyActive !== undefined) qp.set('onlyActive', String(params.onlyActive))
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const diplomasApi = {
  list(params: ListDiplomasParams = {}): Promise<Diploma[]> {
    return apiGet<Diploma[]>(`/diplomas${buildQuery(params)}`)
  },
  get(id: string): Promise<Diploma> {
    return apiGet<Diploma>(`/diplomas/${id}`)
  },
  create(body: DiplomaCreateRequest): Promise<Diploma> {
    return apiPost<Diploma, DiplomaCreateRequest>('/diplomas', body)
  },
  update(id: string, body: DiplomaUpdateRequest): Promise<Diploma> {
    return apiPut<Diploma, DiplomaUpdateRequest>(`/diplomas/${id}`, body)
  },
  deactivate(id: string): Promise<void> {
    return apiPut<void, undefined>(`/diplomas/${id}/deactivate`, undefined)
  },
}
