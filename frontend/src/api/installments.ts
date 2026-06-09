import type { PageResponse } from '../types/common'
import type { Debtor, Installment, InstallmentStatus, InstallmentUpdateRequest } from '../types/installment'
import { apiGet, apiPut } from './client'

// Servicio de cuotas — refleja InstallmentController (/api/v1/installments).

export interface ListInstallmentsParams {
  q?:            string                  // busca por alumno o curso (server-side)
  enrollmentId?: string
  studentId?:    string
  courseId?:     string
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
  if (params.courseId)           qp.set('courseId',     params.courseId)
  if (params.status)             qp.set('status',       params.status)
  if (params.dueFrom)            qp.set('dueFrom',      params.dueFrom)
  if (params.dueTo)              qp.set('dueTo',        params.dueTo)
  if (params.page !== undefined) qp.set('page',         String(params.page))
  if (params.size !== undefined) qp.set('size',         String(params.size))
  if (params.sort)               qp.set('sort',         params.sort)
  const s = qp.toString()
  return s ? `?${s}` : ''
}

// Vista de deudores agrupados por alumno (GET /installments/debtors).
export interface ListDebtorsParams {
  q?:        string
  courseId?: string
  group?:    string                      // PaymentGroup: GROUP_1 | GROUP_2
  dueFrom?:  string                       // YYYY-MM-DD
  dueTo?:    string                       // YYYY-MM-DD
  page?:     number
  size?:     number
}

function buildDebtorsQuery(params: ListDebtorsParams): string {
  const qp = new URLSearchParams()
  if (params.q)                  qp.set('q',        params.q)
  if (params.courseId)           qp.set('courseId', params.courseId)
  if (params.group)              qp.set('group',    params.group)
  if (params.dueFrom)            qp.set('dueFrom',  params.dueFrom)
  if (params.dueTo)              qp.set('dueTo',    params.dueTo)
  if (params.page !== undefined) qp.set('page',     String(params.page))
  if (params.size !== undefined) qp.set('size',     String(params.size))
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const installmentsApi = {
  list(params: ListInstallmentsParams = {}): Promise<PageResponse<Installment>> {
    return apiGet<PageResponse<Installment>>(`/installments${buildQuery(params)}`)
  },
  // Deudores agrupados por alumno/inscripción (cuotas impagas juntas).
  debtors(params: ListDebtorsParams = {}): Promise<PageResponse<Debtor>> {
    return apiGet<PageResponse<Debtor>>(`/installments/debtors${buildDebtorsQuery(params)}`)
  },
  get(id: string): Promise<Installment> {
    return apiGet<Installment>(`/installments/${id}`)
  },
  // Editar monto/vencimiento/nota de una cuota (admin override). No editable si está PAID.
  update(id: string, body: InstallmentUpdateRequest): Promise<Installment> {
    return apiPut<Installment, InstallmentUpdateRequest>(`/installments/${id}`, body)
  },
  byEnrollment(enrollmentId: string): Promise<Installment[]> {
    return apiGet<Installment[]>(`/installments/by-enrollment/${enrollmentId}`)
  },
  // Sólo admin — quita el recargo del 5% de una cuota.
  waiveSurcharge(id: string): Promise<Installment> {
    return apiPut<Installment, undefined>(`/installments/${id}/waive-surcharge`, undefined)
  },
}
