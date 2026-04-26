import type { PageResponse } from '../types/common'
import type { Payment, PaymentCreateRequest } from '../types/payment'
import type { PaymentMethod } from '../types/enrollment'
import { apiGet, apiPost } from './client'

// Servicio de pagos — refleja PaymentController (/api/v1/payments).
// Los pagos son append-only (sin update / delete).

export interface ListPaymentsParams {
  q?:             string             // mock-only
  enrollmentId?:  string
  studentId?:     string
  paymentMethod?: PaymentMethod
  dateFrom?:      string             // YYYY-MM-DD
  dateTo?:        string             // YYYY-MM-DD
  page?:          number
  size?:          number
  sort?:          string
}

function buildQuery(params: ListPaymentsParams): string {
  const qp = new URLSearchParams()
  if (params.q)                  qp.set('q',             params.q)
  if (params.enrollmentId)       qp.set('enrollmentId',  params.enrollmentId)
  if (params.studentId)          qp.set('studentId',     params.studentId)
  if (params.paymentMethod)      qp.set('paymentMethod', params.paymentMethod)
  if (params.dateFrom)           qp.set('dateFrom',      params.dateFrom)
  if (params.dateTo)             qp.set('dateTo',        params.dateTo)
  if (params.page !== undefined) qp.set('page',          String(params.page))
  if (params.size !== undefined) qp.set('size',          String(params.size))
  if (params.sort)               qp.set('sort',          params.sort)
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const paymentsApi = {
  list(params: ListPaymentsParams = {}): Promise<PageResponse<Payment>> {
    return apiGet<PageResponse<Payment>>(`/payments${buildQuery(params)}`)
  },
  get(id: string): Promise<Payment> {
    return apiGet<Payment>(`/payments/${id}`)
  },
  create(body: PaymentCreateRequest): Promise<Payment> {
    return apiPost<Payment, PaymentCreateRequest>('/payments', body)
  },
}
