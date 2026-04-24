import type { PageResponse } from '../types/common'
import type {
  Student,
  StudentCreateRequest,
  StudentUpdateRequest,
} from '../types/student'
import { apiGet, apiPost, apiPut, apiDelete } from './client'

// Servicio de alumnos — refleja StudentController del backend (/api/v1/students).

export interface ListStudentsParams {
  q?:      string
  page?:   number
  size?:   number
  sort?:   string       // ej: "lastName,asc"
  active?: boolean
}

function buildQuery(params: ListStudentsParams): string {
  const qp = new URLSearchParams()
  if (params.q)              qp.set('q', params.q)
  if (params.page !== undefined) qp.set('page', String(params.page))
  if (params.size !== undefined) qp.set('size', String(params.size))
  if (params.sort)           qp.set('sort', params.sort)
  if (params.active !== undefined) qp.set('active', String(params.active))
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const studentsApi = {
  list(params: ListStudentsParams = {}): Promise<PageResponse<Student>> {
    return apiGet<PageResponse<Student>>(`/students${buildQuery(params)}`)
  },
  get(id: string): Promise<Student> {
    return apiGet<Student>(`/students/${id}`)
  },
  create(body: StudentCreateRequest): Promise<Student> {
    return apiPost<Student, StudentCreateRequest>('/students', body)
  },
  update(id: string, body: StudentUpdateRequest): Promise<Student> {
    return apiPut<Student, StudentUpdateRequest>(`/students/${id}`, body)
  },
  remove(id: string): Promise<void> {
    return apiDelete(`/students/${id}`)
  },
}
