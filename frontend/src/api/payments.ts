import type { PageResponse } from '../types/common'
import type { Payment, PaymentCreateRequest } from '../types/payment'
import type { PaymentMethod } from '../types/enrollment'
import { apiGet, apiPost, apiDelete } from './client'

// Servicio de pagos — refleja PaymentController (/api/v1/payments).
// Nombres de params alineados al backend: method / from / to (Instant).
// `courseId` lo soporta el mock; el backend lo ignora hasta que se agregue
// (ver nota a Santi en DIARIO). `remove` (DELETE) requiere endpoint backend nuevo.

export interface ListPaymentsParams {
  q?:            string             // mock-only
  enrollmentId?: string
  studentId?:    string
  courseId?:     string             // mock-only hasta que el backend lo soporte
  method?:       PaymentMethod
  from?:         string             // Instant ISO (ej. 2026-05-01T00:00:00Z)
  to?:           string             // Instant ISO
  page?:         number
  size?:         number
  sort?:         string
}

function buildQuery(params: ListPaymentsParams): string {
  const qp = new URLSearchParams()
  if (params.q)                  qp.set('q',            params.q)
  if (params.enrollmentId)       qp.set('enrollmentId', params.enrollmentId)
  if (params.studentId)          qp.set('studentId',    params.studentId)
  if (params.courseId)           qp.set('courseId',     params.courseId)
  if (params.method)             qp.set('method',       params.method)
  if (params.from)               qp.set('from',         params.from)
  if (params.to)                 qp.set('to',           params.to)
  if (params.page !== undefined) qp.set('page',         String(params.page))
  if (params.size !== undefined) qp.set('size',         String(params.size))
  if (params.sort)               qp.set('sort',         params.sort)
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
  // Deshacer un pago. ⚠️ Requiere DELETE /payments/{id} en el backend
  // (hoy los pagos son append-only). El mock ya revierte la cuota a impaga.
  remove(id: string): Promise<void> {
    return apiDelete(`/payments/${id}`)
  },
}
