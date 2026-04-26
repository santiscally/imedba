import type { PageResponse } from '../types/common'
import type {
  Enrollment,
  EnrollmentCreateRequest,
  EnrollmentUpdateRequest,
  EnrollmentStatus,
} from '../types/enrollment'
import { apiGet, apiPost, apiPut, apiDelete } from './client'

// Servicio de inscripciones — refleja EnrollmentController (/api/v1/enrollments).

export interface ListEnrollmentsParams {
  q?:         string              // No soportado por backend — lo usa el mock y es ignorado por Spring
  studentId?: string
  courseId?:  string
  status?:    EnrollmentStatus
  page?:      number
  size?:      number
  sort?:      string   // ej: "enrollmentDate,desc"
}

function buildQuery(params: ListEnrollmentsParams): string {
  const qp = new URLSearchParams()
  if (params.q)                  qp.set('q',         params.q)
  if (params.studentId)          qp.set('studentId', params.studentId)
  if (params.courseId)           qp.set('courseId',  params.courseId)
  if (params.status)             qp.set('status',    params.status)
  if (params.page !== undefined) qp.set('page',      String(params.page))
  if (params.size !== undefined) qp.set('size',      String(params.size))
  if (params.sort)               qp.set('sort',      params.sort)
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const enrollmentsApi = {
  list(params: ListEnrollmentsParams = {}): Promise<PageResponse<Enrollment>> {
    return apiGet<PageResponse<Enrollment>>(`/enrollments${buildQuery(params)}`)
  },
  get(id: string): Promise<Enrollment> {
    return apiGet<Enrollment>(`/enrollments/${id}`)
  },
  create(body: EnrollmentCreateRequest): Promise<Enrollment> {
    return apiPost<Enrollment, EnrollmentCreateRequest>('/enrollments', body)
  },
  update(id: string, body: EnrollmentUpdateRequest): Promise<Enrollment> {
    return apiPut<Enrollment, EnrollmentUpdateRequest>(`/enrollments/${id}`, body)
  },
  suspend(id: string): Promise<Enrollment> {
    return apiPut<Enrollment, undefined>(`/enrollments/${id}/suspend`, undefined)
  },
  reactivate(id: string): Promise<Enrollment> {
    return apiPut<Enrollment, undefined>(`/enrollments/${id}/reactivate`, undefined)
  },
  cancel(id: string): Promise<Enrollment> {
    return apiPut<Enrollment, undefined>(`/enrollments/${id}/cancel`, undefined)
  },
  remove(id: string): Promise<void> {
    return apiDelete(`/enrollments/${id}`)
  },
}
