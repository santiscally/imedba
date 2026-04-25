import type { PageResponse } from '../types/common'
import type { Installment, InstallmentStatus } from '../types/installment'
import { apiGet, apiPut } from './client'

// Servicio de cuotas — refleja InstallmentController (/api/v1/installments).

export interface ListInstallmentsParams {
  q?:            string                  // mock-only: filtra por alumno/curso
  enrollmentId?: string
  studentId?:    string
  status?:       InstallmentStatus
  dueFrom?:      string                  // YYYY-MM-DD
  dueTo?:        string                  // YYYY-MM-DD
  page?:         number
  size?:         number
  sort?:         string
}

function buildQuery(params: ListInstallmentsParams): string {
  const qp = new URLSearchParams()
  if (params.q)                  qp.set('q',            params.q)
  if (params.enrollmentId)       qp.set('enrollmentId', params.enrollmentId)
  if (params.studentId)          qp.set('studentId',    params.studentId)
  if (params.status)             qp.set('status',       params.status)
  if (params.dueFrom)            qp.set('dueFrom',      params.dueFrom)
  if (params.dueTo)              qp.set('dueTo',        params.dueTo)
  if (params.page !== undefined) qp.set('page',         String(params.page))
  if (params.size !== undefined) qp.set('size',         String(params.size))
  if (params.sort)               qp.set('sort',         params.sort)
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const installmentsApi = {
  list(params: ListInstallmentsParams = {}): Promise<PageResponse<Installment>> {
    return apiGet<PageResponse<Installment>>(`/installments${buildQuery(params)}`)
  },
  get(id: string): Promise<Installment> {
    return apiGet<Installment>(`/installments/${id}`)
  },
  byEnrollment(enrollmentId: string): Promise<Installment[]> {
    return apiGet<Installment[]>(`/installments/by-enrollment/${enrollmentId}`)
  },
  // Sólo admin — quita el recargo del 5% de una cuota.
  waiveSurcharge(id: string): Promise<Installment> {
    return apiPut<Installment, undefined>(`/installments/${id}/waive-surcharge`, undefined)
  },
}
