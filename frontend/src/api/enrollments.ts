import type { PageResponse } from '../types/common'
import type {
  Enrollment,
  EnrollmentCreateRequest,
  EnrollmentUpdateRequest,
  EnrollmentStatus,
} from '../types/enrollment'
import { apiGet, apiGetFile, apiPost, apiPut, apiDelete, saveFile } from './client'

// Servicio de inscripciones — refleja EnrollmentController (/api/v1/enrollments).

export interface ListEnrollmentsParams {
  q?:              string              // no soportado por el backend (ignorado)
  studentId?:      string
  courseId?:       string
  status?:         EnrollmentStatus
  contractSigned?: boolean             // true = sólo firmados, false = sólo sin firmar
  businessUnit?:   string              // la segmentación es server-side por JWT; este param lo ignora Spring
  page?:           number
  size?:           number
  sort?:           string   // ej: "enrollmentDate,desc"
}

function buildQuery(params: ListEnrollmentsParams): string {
  const qp = new URLSearchParams()
  if (params.q)                  qp.set('q',            params.q)
  if (params.studentId)          qp.set('studentId',    params.studentId)
  if (params.courseId)           qp.set('courseId',     params.courseId)
  if (params.status)             qp.set('status',       params.status)
  // Comparación explícita contra undefined: `false` es un filtro válido (sin firmar).
  if (params.contractSigned !== undefined) qp.set('contractSigned', String(params.contractSigned))
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

  /**
   * Tilda / destilda el contrato como firmado.
   *
   * Endpoint propio en vez de `update`: el checkbox del listado no manda el resto del
   * payload ni dispara el recálculo de precios del backend. Es idempotente — volver a
   * tildar no corre la fecha ya registrada.
   */
  setContractSigned(id: string, signed: boolean): Promise<Enrollment> {
    return apiPut<Enrollment, undefined>(
      `/enrollments/${id}/contract-signed?signed=${signed}`, undefined)
  },

  /**
   * Descarga el PDF del contrato de matrícula.
   *
   * Se baja con fetch + Authorization y se dispara con un object URL: el endpoint
   * exige el Bearer, así que un `<a href>` directo devuelve 401.
   */
  async downloadContract(id: string, studentLastName?: string): Promise<void> {
    const file = await apiGetFile(`/enrollments/${id}/contract`)
    const slug = (studentLastName ?? 'alumno')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    saveFile(file, `contrato-${slug || 'alumno'}.pdf`)
  },
}
