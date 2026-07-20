import type { PageResponse } from '../types/common'
import type {
  Enrollment,
  EnrollmentCreateRequest,
  EnrollmentUpdateRequest,
  EnrollmentStatus,
} from '../types/enrollment'
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from './client'
import { getAccessToken } from '../lib/auth'

// Servicio de inscripciones — refleja EnrollmentController (/api/v1/enrollments).

export interface ListEnrollmentsParams {
  q?:            string              // no soportado por el backend (ignorado)
  studentId?:    string
  courseId?:     string
  status?:       EnrollmentStatus
  businessUnit?: string              // la segmentación es server-side por JWT; este param lo ignora Spring
  page?:         number
  size?:         number
  sort?:         string   // ej: "enrollmentDate,desc"
}

function buildQuery(params: ListEnrollmentsParams): string {
  const qp = new URLSearchParams()
  if (params.q)                  qp.set('q',            params.q)
  if (params.studentId)          qp.set('studentId',    params.studentId)
  if (params.courseId)           qp.set('courseId',     params.courseId)
  if (params.status)             qp.set('status',       params.status)
  if (params.businessUnit)       qp.set('businessUnit', params.businessUnit)
  if (params.page !== undefined) qp.set('page',         String(params.page))
  if (params.size !== undefined) qp.set('size',         String(params.size))
  if (params.sort)               qp.set('sort',         params.sort)
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

  // Descarga el contrato PDF con los datos del alumno ya rellenados. El endpoint
  // lo cablea el backend (mail feature). Si no existe todavía → 404 y el caller
  // muestra un aviso amigable.
  async downloadContract(id: string, filename: string): Promise<void> {
    const token = await getAccessToken()
    const raw   = (import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? '/api') as string
    const trimmed = raw.replace(/\/+$/, '')
    const base  = trimmed.endsWith('/api/v1') ? trimmed
                : trimmed.endsWith('/api')    ? `${trimmed}/v1`
                :                                `${trimmed}/api/v1`
    const res = await fetch(`${base}/enrollments/${id}/contract`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      throw new ApiError(
        res.status === 404
          ? 'El contrato aún no fue generado. Se genera al enviar el mail de bienvenida.'
          : `No se pudo descargar el contrato (HTTP ${res.status})`,
        res.status,
      )
    }
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}
